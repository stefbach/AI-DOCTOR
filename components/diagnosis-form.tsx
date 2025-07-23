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
  DollarSign
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
  const [expertAnalysis, setExpertAnalysis] = useState<any>(null)
  const [mauritianDocuments, setMauritianDocuments] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentSection, setCurrentSection] = useState(0)
  const [documentsGenerated, setDocumentsGenerated] = useState(false)

  // Helper function for translations
  const t = (key: string) => getTranslation(key, language)

  // Load saved data on mount
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const currentConsultationId = consultationId || consultationDataService.getCurrentConsultationId()
        
        if (currentConsultationId) {
          const savedData = await consultationDataService.getAllData()
          if (savedData?.diagnosisData) {
            if (savedData.diagnosisData.diagnosis) {
              setDiagnosis(savedData.diagnosisData.diagnosis)
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
        console.error('Error loading saved diagnosis data:', error)
      }
    }
    
    if (!diagnosis) {
      loadSavedData()
    }
  }, [consultationId, diagnosis])

  // Save data when diagnosis is generated
  useEffect(() => {
    const saveData = async () => {
      try {
        const dataToSave = {
          diagnosis,
          expertAnalysis,
          mauritianDocuments,
          documentsGenerated
        }
        await consultationDataService.saveStepData(3, dataToSave)
      } catch (error) {
        console.error('Error saving diagnosis data:', error)
      }
    }
    
    if (diagnosis && mauritianDocuments) {
      saveData()
    }
  }, [diagnosis, expertAnalysis, mauritianDocuments, documentsGenerated])

  useEffect(() => {
    generateCompleteDiagnosisAndDocuments()
  }, [patientData, clinicalData])

  const generateCompleteDiagnosisAndDocuments = async () => {
    if (!patientData || !clinicalData) return

    setLoading(true)
    setError(null)
    setDocumentsGenerated(false)

    try {
      console.log("🩺 Generating complete diagnosis + documents")

      const response = await fetch("/api/openai-diagnosis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientData,
          clinicalData,
          questionsData,
          language,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error ${response.status}: ${errorText.substring(0, 100)}`)
      }

      const data = await response.json()
      console.log("📦 API Response COMPLETE:", data)
      console.log("🎯 Diagnosis data:", data.diagnosis)
      console.log("🧪 Expert Analysis data:", data.expertAnalysis || data.expert_analysis)
      console.log("📋 Mauritian Documents:", data.mauritianDocuments)

      if (data.success && data.diagnosis && data.mauritianDocuments) {
        setDiagnosis(data.diagnosis)
        setExpertAnalysis(data.expertAnalysis || data.expert_analysis)
        setMauritianDocuments(data.mauritianDocuments)
        setDocumentsGenerated(true)
        
        onDataChange({ 
          diagnosis: data.diagnosis, 
          mauritianDocuments: data.mauritianDocuments,
          expertAnalysis: data.expertAnalysis || data.expert_analysis,
          completeData: data 
        })
        
        console.log("✅ Diagnosis + Documents + Expert Analysis generated")
        console.log("🔍 Diagnosis set:", diagnosis)
        console.log("🔍 Expert Analysis set:", expertAnalysis)
        console.log("🔍 Documents set:", mauritianDocuments)
      } else {
        throw new Error(data.error || "Format de réponse invalide")
      }

    } catch (err) {
      console.error("❌ Generation error:", err)
      setError(err instanceof Error ? err.message : "Erreur inconnue")

      // Generate fallback data
      const fallbackData = generateCompleteFallback()
      setDiagnosis(fallbackData.diagnosis)
      setExpertAnalysis(fallbackData.expertAnalysis)
      setMauritianDocuments(fallbackData.mauritianDocuments)
      setDocumentsGenerated(true)
      onDataChange(fallbackData)
      
    } finally {
      setLoading(false)
    }
  }

  const generateCompleteFallback = () => {
    const fallbackDiagnosis = {
      primary: {
        condition: `Syndrome clinique - ${clinicalData.chiefComplaint || "Consultation médicale"}`,
        icd10: "R53",
        confidence: 70,
        severity: "moderate",
        detailedAnalysis: "Analyse basée sur les symptômes présentés nécessitant exploration complémentaire",
        clinicalRationale: `Symptômes: ${clinicalData.chiefComplaint}. Nécessite anamnèse et examen clinique approfondis`,
        prognosis: "Évolution favorable attendue avec prise en charge appropriée"
      },
      differential: [
        {
          condition: "Syndrome viral",
          probability: 40,
          rationale: "Cause fréquente de symptômes non spécifiques"
        }
      ]
    }

    const fallbackExpertAnalysis = {
      expert_investigations: {
        immediate_priority: [
          {
            category: "biology",
            examination: "Hémogramme complet + CRP",
            specific_indication: "Recherche syndrome inflammatoire, infectieux",
            urgency: "urgent",
            mauritius_availability: {
              public_centers: ["Dr Jeetoo Hospital", "Candos Hospital"],
              private_centers: ["Apollo Bramwell", "Lancet Laboratories"],
              estimated_cost: "Rs 600-1200",
              waiting_time: "2-6h urgence, 24h routine"
            }
          },
          {
            category: "imaging", 
            examination: "Radiographie thoracique",
            specific_indication: "Exclusion pathologie pleuro-pulmonaire",
            urgency: "semi-urgent",
            mauritius_availability: {
              public_centers: ["Dr Jeetoo Imagerie", "Candos"],
              private_centers: ["Apollo Bramwell", "Wellkin"],
              estimated_cost: "Rs 400-800",
              waiting_time: "2-4h urgence, 1-3 jours routine"
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
            dosing_regimen: {
              standard_adult: "1000mg x 3-4/jour per os",
              elderly_adjustment: "500-750mg x 3/jour si >75 ans",
              renal_adjustment: "Espacement si insuffisance rénale"
            },
            treatment_duration: "3-5 jours",
            contraindications_absolute: ["Hypersensibilité", "Insuffisance hépatique sévère"],
            monitoring_parameters: ["Efficacité antalgique", "Tolérance hépatique"],
            mauritius_availability: {
              locally_available: true,
              private_sector_cost: "Rs 50-200/semaine"
            }
          }
        ]
      },
      drug_interaction_analysis: []
    }

    const dateFormat = new Date().toLocaleDateString("fr-FR")
    
    const fallbackDocuments = {
      consultation: {
        header: {
          title: "COMPTE-RENDU DE CONSULTATION MÉDICALE",
          date: dateFormat,
          physician: "Dr. MÉDECIN EXPERT"
        },
        patient: {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          age: `${patientData.age} ans`
        },
        content: {
          chiefComplaint: clinicalData.chiefComplaint,
          diagnosis: fallbackDiagnosis.primary.condition
        }
      }
    }

    return {
      diagnosis: fallbackDiagnosis,
      expertAnalysis: fallbackExpertAnalysis,
      mauritianDocuments: fallbackDocuments
    }
  }

  const sections = [
    { id: "primary", title: "Diagnostic Principal", icon: Target },
    { id: "examinations", title: "Examens Recommandés", icon: TestTube },
    { id: "treatments", title: "Traitements Prescrits", icon: Pill },
    { id: "differential", title: "Diagnostics Différentiels", icon: Search },
    { id: "monitoring", title: "Surveillance", icon: Monitor },
    { id: "documents", title: "Documents Maurice", icon: FileText },
  ]

  // Loading interface
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-4">
        <div className="max-w-6xl mx-auto">
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
                  <p className="text-lg text-gray-600">Diagnostic + Examens + Traitements + Documents</p>
                  <div className="max-w-md mx-auto text-sm text-gray-500 space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      <Target className="h-4 w-4" />
                      <span>Diagnostic différentiel expert</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <TestTube className="h-4 w-4" />
                      <span>Examens spécifiques au diagnostic</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Pill className="h-4 w-4" />
                      <span>Traitements adaptés + posologies</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Documents mauriciens complets</span>
                    </div>
                  </div>
                </div>
                <Progress value={75} className="w-96 mx-auto h-3" />
                <p className="text-xs text-gray-400">Powered by GPT-4o - 8000 tokens</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Error interface
  if (!diagnosis && error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6" />
                Service Temporairement Indisponible
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 text-center">
              <div className="space-y-4">
                <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto" />
                <p className="text-lg text-gray-700">Impossible de générer l'analyse médicale</p>
                <p className="text-sm text-gray-600">Erreur: {error}</p>
                <Button onClick={generateCompleteDiagnosisAndDocuments} className="mt-6">
                  <Brain className="h-4 w-4 mr-2" />
                  Réessayer
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Main interface
  if (!diagnosis) {
    console.log("⚠️ Pas de diagnosis disponible")
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center">
              <Brain className="h-16 w-16 text-blue-500 mx-auto mb-4" />
              <p className="text-lg text-gray-700">Aucun diagnostic disponible</p>
              <Button onClick={generateCompleteDiagnosisAndDocuments} className="mt-4">
                <Brain className="h-4 w-4 mr-2" />
                Générer Diagnostic
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  console.log("🎯 RENDU INTERFACE - Diagnosis:", diagnosis)
  console.log("🧪 RENDU INTERFACE - Expert Analysis:", expertAnalysis)

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Success header */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-3 text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
              Analyse Médicale Experte Complète
            </CardTitle>
            <div className="flex justify-center gap-4 mt-4">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300">
                Confiance IA: {diagnosis?.primary?.confidence || 70}%
              </Badge>
              <Badge className="bg-blue-500 text-white">
                GPT-4o Expert
              </Badge>
              {documentsGenerated && (
                <Badge className="bg-green-500 text-white">
                  Documents Prêts
                </Badge>
              )}
              {error && <Badge variant="destructive">Mode Fallback</Badge>}
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

        {/* DEBUG: Si pas d'examens */}
        {currentSection === 1 && (!expertAnalysis?.expert_investigations?.immediate_priority || expertAnalysis.expert_investigations.immediate_priority.length === 0) && (
          <Card className="bg-yellow-50 border border-yellow-200">
            <CardContent className="p-6">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Examens en cours de génération</h3>
                <p className="text-yellow-700">Les examens recommandés seront disponibles sous peu.</p>
                <div className="mt-4 space-y-2 text-sm text-yellow-600">
                  <p><strong>Debug:</strong> expertAnalysis = {expertAnalysis ? 'Présent' : 'Absent'}</p>
                  <p><strong>Expert investigations:</strong> {expertAnalysis?.expert_investigations ? 'Présent' : 'Absent'}</p>
                  <p><strong>Immediate priority:</strong> {expertAnalysis?.expert_investigations?.immediate_priority ? `${expertAnalysis.expert_investigations.immediate_priority.length} éléments` : 'Absent'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* DEBUG: Si pas de traitements */}
        {currentSection === 2 && (!expertAnalysis?.expert_therapeutics?.primary_treatments || expertAnalysis.expert_therapeutics.primary_treatments.length === 0) && (
          <Card className="bg-yellow-50 border border-yellow-200">
            <CardContent className="p-6">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">Traitements en cours de génération</h3>
                <p className="text-yellow-700">Les traitements recommandés seront disponibles sous peu.</p>
                <div className="mt-4 space-y-2 text-sm text-yellow-600">
                  <p><strong>Debug:</strong> expertAnalysis = {expertAnalysis ? 'Présent' : 'Absent'}</p>
                  <p><strong>Expert therapeutics:</strong> {expertAnalysis?.expert_therapeutics ? 'Présent' : 'Absent'}</p>
                  <p><strong>Primary treatments:</strong> {expertAnalysis?.expert_therapeutics?.primary_treatments ? `${expertAnalysis.expert_therapeutics.primary_treatments.length} éléments` : 'Absent'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* PRIMARY DIAGNOSIS */}
        {currentSection === 0 && (
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
                  {diagnosis?.primary?.condition || "Diagnostic à préciser"}
                </h3>
                <div className="flex justify-center gap-4">
                  <Badge className="bg-emerald-100 text-emerald-800 text-sm px-4 py-2">
                    Probabilité: {diagnosis?.primary?.confidence || 70}%
                  </Badge>
                  <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-sm px-4 py-2">
                    Sévérité: {diagnosis?.primary?.severity || "À évaluer"}
                  </Badge>
                  {diagnosis?.primary?.icd10 && (
                    <Badge variant="outline" className="border-blue-300 text-blue-700 text-sm px-4 py-2">
                      CIM-10: {diagnosis.primary.icd10}
                    </Badge>
                  )}
                </div>
              </div>

              {diagnosis?.primary?.detailedAnalysis && (
                <div>
                  <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Brain className="h-5 w-5 text-emerald-600" />
                    Analyse Physiopathologique Détaillée
                  </h4>
                  <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {diagnosis.primary.detailedAnalysis}
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
                      {diagnosis.primary.clinicalRationale}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* EXAMENS RECOMMANDÉS */}
        {currentSection === 1 && expertAnalysis?.expert_investigations?.immediate_priority && expertAnalysis.expert_investigations.immediate_priority.length > 0 && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <TestTube className="h-6 w-6" />
                Examens Recommandés ({expertAnalysis.expert_investigations.immediate_priority.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid gap-6">
                {expertAnalysis.expert_investigations.immediate_priority.map((exam: any, index: number) => (
                  <div key={index} className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-gradient-to-r from-gray-50 to-red-50">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {exam.category === 'biology' && <TestTube className="h-6 w-6 text-red-600" />}
                        {exam.category === 'imaging' && <Activity className="h-6 w-6 text-blue-600" />}
                        {exam.category === 'functional' && <Stethoscope className="h-6 w-6 text-green-600" />}
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">{exam.examination}</h3>
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
                        <p className="text-sm text-gray-600">{exam.specific_indication}</p>
                      </div>

                      {exam.technique_details && (
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-1">TECHNIQUE :</h4>
                          <p className="text-sm text-gray-600">{exam.technique_details}</p>
                        </div>
                      )}

                      {exam.interpretation_keys && (
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-1">INTERPRÉTATION :</h4>
                          <p className="text-sm text-gray-600">{exam.interpretation_keys}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 bg-white rounded border">
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            DISPONIBILITÉ MAURICE :
                          </h4>
                          <div className="space-y-1">
                            <p className="text-xs text-blue-600">
                              <strong>Public:</strong> {exam.mauritius_availability?.public_centers?.join(', ') || 'À vérifier'}
                            </p>
                            <p className="text-xs text-green-600">
                              <strong>Privé:</strong> {exam.mauritius_availability?.private_centers?.join(', ') || 'À vérifier'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2 flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            COÛT & DÉLAI :
                          </h4>
                          <div className="space-y-1">
                            <p className="text-xs text-green-600">
                              <strong>Coût:</strong> {exam.mauritius_availability?.estimated_cost || 'À vérifier'}
                            </p>
                            <p className="text-xs text-orange-600">
                              <strong>Délai:</strong> {exam.mauritius_availability?.waiting_time || 'À vérifier'}
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

        {/* TRAITEMENTS PRESCRITS */}
        {currentSection === 2 && expertAnalysis?.expert_therapeutics?.primary_treatments && expertAnalysis.expert_therapeutics.primary_treatments.length > 0 && (
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
                          <h3 className="font-bold text-lg text-gray-800">{treatment.medication_dci}</h3>
                          <Badge variant="outline" className="mt-1 border-purple-300 text-purple-700">
                            {treatment.therapeutic_class}
                          </Badge>
                        </div>
                      </div>
                      <Badge className={`${
                        treatment.mauritius_availability?.locally_available ? 
                        'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {treatment.mauritius_availability?.locally_available ? 'DISPONIBLE MU' : 'À COMMANDER'}
                      </Badge>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-sm text-gray-700 mb-1">INDICATION :</h4>
                        <p className="text-sm text-gray-600">{treatment.precise_indication}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">POSOLOGIE :</h4>
                          <div className="space-y-1 text-sm">
                            <p><strong>Adulte:</strong> {treatment.dosing_regimen?.standard_adult || 'À préciser'}</p>
                            <p><strong>Sujet âgé:</strong> {treatment.dosing_regimen?.elderly_adjustment || 'Adaptation selon âge'}</p>
                            {treatment.dosing_regimen?.renal_adjustment && (
                              <p><strong>Insuff. rénale:</strong> {treatment.dosing_regimen.renal_adjustment}</p>
                            )}
                            {treatment.dosing_regimen?.hepatic_adjustment && (
                              <p><strong>Insuff. hépatique:</strong> {treatment.dosing_regimen.hepatic_adjustment}</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-gray-700 mb-2">ADMINISTRATION :</h4>
                          <div className="space-y-1 text-sm">
                            <p><strong>Voie:</strong> {treatment.administration_route || 'Per os'}</p>
                            <p><strong>Durée:</strong> {treatment.treatment_duration || 'Selon évolution'}</p>
                            <p><strong>Coût MU:</strong> {treatment.mauritius_availability?.private_sector_cost || 'À vérifier'}</p>
                          </div>
                        </div>
                      </div>

                      {treatment.contraindications_absolute && treatment.contraindications_absolute.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm text-red-700 mb-1 flex items-center gap-1">
                            <AlertCircle className="h-4 w-4" />
                            CONTRE-INDICATIONS :
                          </h4>
                          <div className="bg-red-50 border border-red-200 rounded p-2">
                            <p className="text-sm text-red-700">{treatment.contraindications_absolute.join(', ')}</p>
                          </div>
                        </div>
                      )}

                      {treatment.monitoring_parameters && treatment.monitoring_parameters.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm text-blue-700 mb-1 flex items-center gap-1">
                            <Monitor className="h-4 w-4" />
                            SURVEILLANCE :
                          </h4>
                          <div className="bg-blue-50 border border-blue-200 rounded p-2">
                            <p className="text-sm text-blue-700">{treatment.monitoring_parameters.join(', ')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Interactions médicamenteuses */}
              {expertAnalysis?.drug_interaction_analysis && expertAnalysis.drug_interaction_analysis.length > 0 && (
                <div className="mt-8 p-6 bg-orange-50 border border-orange-200 rounded-lg">
                  <h3 className="font-bold text-lg text-orange-800 mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Interactions Médicamenteuses Détectées
                  </h3>
                  <div className="space-y-3">
                    {expertAnalysis.drug_interaction_analysis.map((interaction: any, index: number) => (
                      <div key={index} className="bg-white p-4 rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">
                            {interaction.current_medication} + {interaction.prescribed_medication}
                          </span>
                          <Badge className={`${
                            interaction.interaction_severity === 'major' ? 'bg-red-100 text-red-800' :
                            interaction.interaction_severity === 'moderate' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {interaction.interaction_severity?.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          <strong>Conséquence:</strong> {interaction.clinical_consequence}
                        </p>
                        <p className="text-sm text-blue-600">
                          <strong>Gestion:</strong> {interaction.management_strategy}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* DIAGNOSTICS DIFFÉRENTIELS */}
        {currentSection === 3 && diagnosis?.differential && diagnosis.differential.length > 0 && (
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
                      <h4 className="font-semibold text-lg text-blue-800">{diff.condition}</h4>
                      <Badge className="bg-blue-100 text-blue-800">{diff.probability}%</Badge>
                    </div>
                    
                    {diff.rationale && (
                      <p className="text-sm text-gray-600 italic mb-2">{diff.rationale}</p>
                    )}
                    
                    {diff.distinguishingFeatures && (
                      <div className="bg-blue-50 p-3 rounded border border-blue-200">
                        <span className="font-medium text-blue-700">Éléments distinctifs: </span>
                        <span className="text-sm text-blue-600">{diff.distinguishingFeatures}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* SURVEILLANCE */}
        {currentSection === 4 && (
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
                    <li>• Urgences Maurice: 999 (SAMU)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* DOCUMENTS MAURICIENS */}
        {currentSection === 5 && documentsGenerated && mauritianDocuments && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <FileText className="h-6 w-6" />
                Documents Médicaux Mauriciens
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                
                {/* Consultation */}
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-blue-800">Compte Rendu Consultation</h3>
                      <p className="text-sm text-blue-600">Document professionnel complet</p>
                    </div>
                  </div>
                  <div className="text-xs text-blue-700 space-y-1">
                    <p><strong>Patient:</strong> {mauritianDocuments.consultation?.patient?.firstName} {mauritianDocuments.consultation?.patient?.lastName}</p>
                    <p><strong>Diagnostic:</strong> {mauritianDocuments.consultation?.content?.diagnosis || diagnosis?.primary?.condition}</p>
                  </div>
                </div>

                {/* Autres documents */}
                <div className="bg-red-50 p-6 rounded-lg border border-red-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <TestTube className="h-8 w-8 text-red-600" />
                    <div>
                      <h3 className="font-semibold text-red-800">Examens Biologiques</h3>
                      <p className="text-sm text-red-600">Prescriptions laboratoire</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 p-6 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <Stethoscope className="h-8 w-8 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-800">Examens Paracliniques</h3>
                      <p className="text-sm text-green-600">Imagerie et explorations</p>
                    </div>
                  </div>
                </div>

                <div className="bg-purple-50 p-6 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <Pill className="h-8 w-8 text-purple-600" />
                    <div>
                      <h3 className="font-semibold text-purple-800">Prescription Médicamenteuse</h3>
                      <p className="text-sm text-purple-600">Ordonnance sécurisée</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-100 p-4 rounded-lg border border-blue-300">
                <div className="flex items-center gap-2 mb-2">
                  <Edit3 className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-800">Documents Entièrement Éditables</span>
                </div>
                <p className="text-sm text-blue-700">
                  Tous les documents sont modifiables et imprimables selon les standards mauriciens.
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
              Générer Analyse Complète
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
