"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  ArrowLeft, 
  ArrowRight, 
  Brain, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Stethoscope,
  FlaskConical,
  Pill,
  TrendingUp,
  Shield,
  Target,
  Activity,
  Eye,
  Search
} from "lucide-react"

interface DiagnosisFormProps {
  patientData: any
  clinicalData: any
  questionsData: any
  onDataChange: (data: any) => void
  onNext: () => void
  onPrevious: () => void
}

export default function ModernDiagnosisForm({
  patientData,
  clinicalData,
  questionsData,
  onDataChange,
  onNext,
  onPrevious,
}: DiagnosisFormProps) {
  const [diagnosis, setDiagnosis] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentSection, setCurrentSection] = useState(0)

  useEffect(() => {
    generateDiagnosis()
  }, [patientData, clinicalData, questionsData])

  const generateDiagnosis = async () => {
    if (!patientData || !clinicalData) return

    setLoading(true)
    setError(null)

    try {
      console.log("🩺 Envoi données diagnostic:", { patientData, clinicalData, questionsData })

      const response = await fetch("/api/diagnosis-expert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientData,
          clinicalData,
          questionsData,
        }),
      })

      console.log("📡 Statut réponse:", response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Erreur API:", response.status, errorText)
        throw new Error(`Erreur API ${response.status}: ${errorText.substring(0, 100)}`)
      }

      const responseText = await response.text()
      console.log("📝 Réponse brute:", responseText.substring(0, 200) + "...")

      let data
      try {
        data = JSON.parse(responseText)
      } catch (jsonError) {
        console.error("❌ Erreur parsing JSON:", jsonError)
        console.error("📝 Contenu reçu:", responseText.substring(0, 500))
        
        if (responseText.includes("Internal Server Error") || responseText.includes("<html")) {
          throw new Error("Erreur serveur interne - diagnostic temporairement indisponible")
        } else {
          throw new Error("Format de réponse invalide - contenu non-JSON reçu")
        }
      }

      if (data.success && data.diagnosis) {
        console.log("✅ Diagnostic reçu:", data.diagnosis)
        setDiagnosis(data.diagnosis)
        onDataChange({ diagnosis: data.diagnosis })
      } else {
        throw new Error(data.error || "Format de réponse invalide")
      }

    } catch (err) {
      console.error("❌ Erreur génération diagnostic:", err)
      setError(err instanceof Error ? err.message : "Erreur inconnue")

      // Diagnostic de fallback amélioré
      const fallbackDiagnosis = {
        primaryDiagnosis: {
          condition: `Syndrome clinique - ${clinicalData.chiefComplaint || "Consultation médicale"}`,
          probability: 75,
          severity: "Modérée",
          arguments: [
            "Analyse symptomatique basée sur l'examen clinique",
            "Corrélation avec les données vitales disponibles", 
            "Prise en compte du contexte anamnestique"
          ]
        },
        differentialDiagnosis: [
          {
            condition: "Diagnostic différentiel #1",
            probability: 60,
            arguments: "Symptômes compatibles mais contexte clinique à préciser"
          },
          {
            condition: "Diagnostic différentiel #2", 
            probability: 45,
            arguments: "Présentation atypique nécessitant exploration complémentaire"
          }
        ],
        clinicalReasoning: {
          semiology: `Analyse des symptômes présentés: ${(clinicalData.symptoms || []).join(", ") || "Symptômes en cours d'évaluation"}`,
          syndromes: ["Syndrome principal à caractériser", "Signes d'accompagnement à surveiller"],
          pathophysiology: "Mécanismes physiopathologiques en cours d'élucidation par examens complémentaires"
        },
        recommendedExams: [
          {
            category: "Biologie",
            exam: "Bilan biologique standard complet",
            indication: "Évaluation systémique et recherche de marqueurs",
            urgency: "Programmée",
          },
          {
            category: "Imagerie",
            exam: "Imagerie orientée selon symptômes",
            indication: "Exploration morphologique ciblée",
            urgency: "Selon évolution",
          },
          {
            category: "Clinique",
            exam: "Consultation spécialisée si nécessaire",
            indication: "Expertise diagnostique complémentaire",
            urgency: "Programmée",
          }
        ],
        therapeuticStrategy: {
          immediate: [
            {
              type: "Symptomatique",
              treatment: "Prise en charge symptomatique adaptée",
              indication: "Amélioration du confort en attendant précisions diagnostiques",
              duration: "Selon évolution clinique"
            },
            {
              type: "Surveillance",
              treatment: "Monitoring clinique rapproché",
              indication: "Surveillance évolution et dépistage complications",
              duration: "Continue"
            }
          ],
        },
        prognosis: {
          shortTerm: "Évolution favorable attendue avec prise en charge adaptée",
          longTerm: "Pronostic dépendant du diagnostic final et de la réponse thérapeutique",
          complications: ["Évolution défavorable si retard diagnostique", "Complications selon pathologie sous-jacente"],
          followUp: "Réévaluation clinique systématique et adaptation thérapeutique"
        },
        aiConfidence: 65,
        redFlags: [
          "Détérioration brutale de l'état clinique",
          "Apparition de signes neurologiques",
          "Signes de défaillance d'organe",
          "Absence d'amélioration sous traitement"
        ]
      }

      setDiagnosis(fallbackDiagnosis)
      onDataChange({ diagnosis: fallbackDiagnosis })
      
    } finally {
      setLoading(false)
    }
  }

  const sections = [
    { id: "primary", title: "Diagnostic principal", icon: Target },
    { id: "reasoning", title: "Raisonnement", icon: Brain },
    { id: "differential", title: "Différentiels", icon: Search },
    { id: "exams", title: "Examens", icon: FlaskConical },
    { id: "treatment", title: "Traitement", icon: Pill },
    { id: "prognosis", title: "Pronostic", icon: TrendingUp },
    { id: "alerts", title: "Alertes", icon: Shield },
  ]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-4">
        <div className="max-w-6xl mx-auto">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-3 text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                <Brain className="h-10 w-10 text-emerald-600" />
                Diagnostic IA Expert
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
                  <p className="text-2xl font-bold text-gray-800">Analyse diagnostique en cours...</p>
                  <p className="text-lg text-gray-600">L'IA Expert analyse l'ensemble des données cliniques</p>
                  <div className="max-w-md mx-auto text-sm text-gray-500 space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      <Activity className="h-4 w-4" />
                      <span>Traitement des symptômes et signes cliniques</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Brain className="h-4 w-4" />
                      <span>Génération d'hypothèses diagnostiques</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Target className="h-4 w-4" />
                      <span>Établissement des recommandations</span>
                    </div>
                  </div>
                </div>
                <Progress value={85} className="w-96 mx-auto h-3" />
                <p className="text-xs text-gray-400">Veuillez patienter, cette analyse peut prendre quelques secondes</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!diagnosis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6" />
                Diagnostic Temporairement Indisponible
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 text-center">
              <div className="space-y-4">
                <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto" />
                <p className="text-lg text-gray-700">Impossible de générer le diagnostic automatique.</p>
                <p className="text-sm text-gray-600">Veuillez vérifier les données saisies et réessayer.</p>
                <Button onClick={generateDiagnosis} className="mt-6">
                  <Brain className="h-4 w-4 mr-2" />
                  Réessayer l'analyse
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-3 text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
              Diagnostic IA Expert Généré
            </CardTitle>
            <div className="flex justify-center gap-4 mt-4">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300">
                Confiance IA: {diagnosis.aiConfidence || 0}%
              </Badge>
              {error && <Badge variant="destructive">Mode Fallback Activé</Badge>}
            </div>
          </CardHeader>
        </Card>

        {/* Alert for fallback mode */}
        {error && (
          <Card className="bg-amber-50/80 backdrop-blur-sm border-amber-200 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-amber-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm font-medium">
                  ⚠️ Diagnostic IA Expert indisponible. Analyse générique utilisée pour assurer la continuité diagnostique.
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section Navigation */}
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

        {/* Primary Diagnosis */}
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
                {diagnosis.primaryDiagnosis?.condition || "Diagnostic à préciser"}
              </h3>
              <div className="flex justify-center gap-4">
                <Badge className="bg-emerald-100 text-emerald-800 text-sm px-4 py-2">
                  Probabilité: {diagnosis.primaryDiagnosis?.probability || 0}%
                </Badge>
                <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-sm px-4 py-2">
                  Sévérité: {diagnosis.primaryDiagnosis?.severity || "À évaluer"}
                </Badge>
              </div>
            </div>

            {diagnosis.primaryDiagnosis?.arguments && (
              <div>
                <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-emerald-600" />
                  Arguments Diagnostiques
                </h4>
                <div className="grid gap-4">
                  {Array.isArray(diagnosis.primaryDiagnosis.arguments) ? (
                    diagnosis.primaryDiagnosis.arguments.map((arg: any, index: number) => (
                      <div key={index} className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 hover:shadow-md transition-shadow">
                        {typeof arg === 'string' ? (
                          <p className="text-sm text-gray-700 leading-relaxed">{arg}</p>
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-emerald-200 text-emerald-800 text-xs">
                                {arg.type || 'Argument'}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {arg.weight || 'Modéré'}
                              </Badge>
                            </div>
                            <p className="font-medium text-gray-800">
                              {arg.evidence || 'Élément clinique'}
                            </p>
                            <p className="text-sm text-gray-600 italic">
                              {arg.significance || 'Signification diagnostique'}
                            </p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-600 italic">Arguments en cours d'analyse...</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clinical Reasoning */}
        {diagnosis.clinicalReasoning && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <Brain className="h-6 w-6" />
                Raisonnement Clinique Expert
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {diagnosis.clinicalReasoning.semiology && (
                <div>
                  <h4 className="font-semibold text-lg mb-3 text-blue-800">Analyse Sémiologique</h4>
                  <div className="bg-blue-50 p-5 rounded-lg border border-blue-200">
                    <p className="text-gray-700 leading-relaxed">
                      {diagnosis.clinicalReasoning.semiology}
                    </p>
                  </div>
                </div>
              )}

              {diagnosis.clinicalReasoning.syndromes && (
                <div>
                  <h4 className="font-semibold text-lg mb-3 text-blue-800">Syndromes Identifiés</h4>
                  <div className="grid gap-4">
                    {Array.isArray(diagnosis.clinicalReasoning.syndromes) ? (
                      diagnosis.clinicalReasoning.syndromes.map((syndrome: any, index: number) => (
                        <div key={index} className="border border-blue-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                          {typeof syndrome === 'string' ? (
                            <Badge variant="outline" className="border-blue-300 text-blue-700">{syndrome}</Badge>
                          ) : (
                            <div className="space-y-3">
                              <Badge variant="outline" className="border-blue-300 text-blue-700">
                                {syndrome.name || 'Syndrome'}
                              </Badge>
                              {syndrome.description && (
                                <p className="text-sm text-gray-600">{syndrome.description}</p>
                              )}
                              {syndrome.presence && (
                                <div className="bg-blue-50 p-3 rounded text-xs border border-blue-200">
                                  <span className="font-medium">Présence: </span>
                                  {syndrome.presence}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic">Syndromes en cours d'analyse...</p>
                    )}
                  </div>
                </div>
              )}

              {diagnosis.clinicalReasoning.pathophysiology && (
                <div>
                  <h4 className="font-semibold text-lg mb-3 text-blue-800">Physiopathologie</h4>
                  <div className="bg-blue-50 p-5 rounded-lg border border-blue-200">
                    <p className="text-gray-700 leading-relaxed">
                      {diagnosis.clinicalReasoning.pathophysiology}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Differential Diagnosis */}
        {diagnosis.differentialDiagnosis && diagnosis.differentialDiagnosis.length > 0 && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <Search className="h-6 w-6" />
                Diagnostics Différentiels
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid gap-6">
                {diagnosis.differentialDiagnosis.map((diff: any, index: number) => (
                  <div key={index} className="border-l-4 border-purple-400 pl-6 bg-purple-25 p-4 rounded-r-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-lg text-purple-800">{diff.condition}</h4>
                      <Badge className="bg-purple-100 text-purple-800">{diff.probability}%</Badge>
                    </div>
                    
                    {diff.detailedDescription && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-700 leading-relaxed italic">
                          {diff.detailedDescription}
                        </p>
                      </div>
                    )}
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      {diff.argumentsFor && diff.argumentsFor.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold text-green-700 mb-2 flex items-center gap-1">
                            <CheckCircle className="h-4 w-4" />
                            Arguments en faveur
                          </h5>
                          <div className="space-y-2">
                            {diff.argumentsFor.map((arg: any, argIndex: number) => (
                              <div key={argIndex} className="bg-green-50 p-3 rounded text-xs border border-green-200">
                                <span className="font-medium">{arg.evidence || arg}</span>
                                {arg.significance && (
                                  <span className="text-green-600 block mt-1">→ {arg.significance}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {diff.argumentsAgainst && diff.argumentsAgainst.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4" />
                            Arguments contre
                          </h5>
                          <div className="space-y-2">
                            {diff.argumentsAgainst.map((arg: any, argIndex: number) => (
                              <div key={argIndex} className="bg-red-50 p-3 rounded text-xs border border-red-200">
                                <span className="font-medium">{arg.evidence || arg}</span>
                                {arg.significance && (
                                  <span className="text-red-600 block mt-1">→ {arg.significance}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {diff.arguments && typeof diff.arguments === 'string' && (
                      <p className="text-sm text-gray-600 mt-3 italic">{diff.arguments}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommended Exams */}
        {diagnosis.recommendedExams && diagnosis.recommendedExams.length > 0 && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <FlaskConical className="h-6 w-6" />
                Examens Complémentaires Recommandés
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid gap-4">
                {diagnosis.recommendedExams.map((exam: any, index: number) => (
                  <div key={index} className="bg-white border border-orange-200 rounded-lg p-5 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-lg text-orange-800">{exam.exam}</h4>
                      <Badge 
                        variant={exam.urgency === "Immédiate" ? "destructive" : exam.urgency === "Programmée" ? "secondary" : "outline"}
                        className="text-sm"
                      >
                        {exam.urgency}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700 mb-3 leading-relaxed">{exam.indication}</p>
                    <Badge variant="outline" className="border-orange-300 text-orange-700">
                      {exam.category}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Therapeutic Strategy */}
        {diagnosis.therapeuticStrategy && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <Pill className="h-6 w-6" />
                Stratégie Thérapeutique
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              {diagnosis.therapeuticStrategy.immediate && (
                <div>
                  <h4 className="font-semibold text-lg mb-4 text-green-800 flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Prise en Charge Immédiate
                  </h4>
                  <div className="grid gap-4">
                    {diagnosis.therapeuticStrategy.immediate.map((treatment: any, index: number) => (
                      <div key={index} className="bg-green-50 p-5 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-green-800">{treatment.treatment}</span>
                          <Badge variant="outline" className="border-green-400 text-green-700">
                            {treatment.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-2 leading-relaxed">{treatment.indication}</p>
                        {treatment.duration && (
                          <p className="text-xs text-gray-500 bg-white p-2 rounded border">
                            <span className="font-medium">Durée:</span> {treatment.duration}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Red Flags */}
        {diagnosis.redFlags && diagnosis.redFlags.length > 0 && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 border-red-200">
            <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <Shield className="h-6 w-6" />
                Signaux d'Alarme Critiques
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid gap-4">
                {diagnosis.redFlags.map((flag: any, index: number) => (
                  <div key={index} className="flex items-start gap-4 p-4 bg-red-50 rounded-lg border-l-4 border-red-400 hover:shadow-md transition-shadow">
                    <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      {typeof flag === 'string' ? (
                        <span className="text-sm text-red-800 font-medium">{flag}</span>
                      ) : (
                        <div className="space-y-2">
                          <div className="font-semibold text-red-800 text-base">
                            {flag.sign || 'Signe d\'alarme'}
                          </div>
                          {flag.significance && (
                            <div className="text-sm text-red-700">
                              <span className="font-medium">Signification: </span>
                              {flag.significance}
                            </div>
                          )}
                          {flag.action && (
                            <div className="text-sm text-white bg-red-600 p-3 rounded font-medium">
                              <span className="font-semibold">Action requise: </span>
                              {flag.action}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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
            Retour aux Questions IA
          </Button>
          <Button 
            onClick={onNext}
            className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Continuer vers les Prescriptions
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
