"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, Brain, Loader2, CheckCircle, AlertTriangle } from "lucide-react"

interface DiagnosisFormProps {
  patientData: any
  clinicalData: any
  questionsData: any
  onDataChange: (data: any) => void
  onNext: () => void
  onPrevious: () => void
}

export default function DiagnosisForm({
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

    // CORRECTION PRINCIPALE : Vérifier le statut AVANT de parser JSON
    if (!response.ok) {
      const errorText = await response.text()
      console.error("❌ Erreur API:", response.status, errorText)
      throw new Error(`Erreur API ${response.status}: ${errorText.substring(0, 100)}`)
    }

    // Obtenir le texte brut pour debug
    const responseText = await response.text()
    console.log("📝 Réponse brute:", responseText.substring(0, 200) + "...")

    // Tenter de parser le JSON
    let data
    try {
      data = JSON.parse(responseText)
    } catch (jsonError) {
      console.error("❌ Erreur parsing JSON:", jsonError)
      console.error("📝 Contenu reçu:", responseText.substring(0, 500))
      
      // Si ce n'est pas du JSON, considérer comme erreur serveur
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
        condition: `Évaluation clinique en cours - ${clinicalData.chiefComplaint || "Consultation médicale"}`,
        probability: 70,
        severity: "À déterminer",
        arguments: [
          "Analyse symptomatique en cours",
          "Nécessité d'examens complémentaires",
          "Surveillance clinique recommandée"
        ]
      },
      clinicalReasoning: {
        semiology: `Analyse des symptômes présentés: ${(clinicalData.symptoms || []).join(", ") || "Symptômes à préciser"}`,
        syndromes: ["Syndrome clinique à caractériser"],
        pathophysiology: "Mécanismes physiopathologiques à élucider par examens complémentaires"
      },
      recommendedExams: [
        {
          category: "Biologie",
          exam: "Bilan biologique standard (NFS, CRP, ionogramme)",
          indication: "Évaluation générale et recherche de syndrome inflammatoire",
          urgency: "Programmée",
        },
        {
          category: "Clinique",
          exam: "Réévaluation clinique à 24-48h",
          indication: "Surveillance évolution symptomatique",
          urgency: "Programmée",
        }
      ],
      therapeuticStrategy: {
        immediate: [
          {
            type: "Symptomatique",
            treatment: "Traitement symptomatique adapté selon symptômes",
            indication: "Soulagement symptomatique en attendant diagnostic",
            duration: "Selon évolution"
          },
        ],
      },
      prognosis: {
        shortTerm: "À réévaluer selon évolution clinique",
        longTerm: "Dépendant du diagnostic final",
        complications: ["À surveiller selon évolution"],
        followUp: "Consultation de réévaluation nécessaire"
      },
      aiConfidence: 50,
      redFlags: [
        "Aggravation brutale des symptômes",
        "Apparition de nouveaux signes",
        "Altération de l'état général"
      ]
    }

    setDiagnosis(fallbackDiagnosis)
    onDataChange({ diagnosis: fallbackDiagnosis })
    
  } finally {
    setLoading(false)
  }
}

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Diagnostic IA Expert
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium">Analyse diagnostique en cours...</p>
              <p className="text-sm text-gray-600 mt-2">
                L'IA analyse toutes les données pour établir un diagnostic expert
              </p>
              <Progress value={75} className="w-64 mx-auto mt-4" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!diagnosis) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Diagnostic non disponible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">Impossible de générer le diagnostic. Veuillez vérifier les données saisies.</p>
            <Button onClick={generateDiagnosis} className="mt-4">
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Diagnostic IA Expert
          </CardTitle>
          <div className="flex items-center justify-between mt-4">
            <Badge variant="outline">Confiance IA: {diagnosis.aiConfidence || 0}%</Badge>
            {error && <Badge variant="destructive">Mode fallback</Badge>}
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <span className="text-sm">⚠️ Diagnostic IA indisponible. Analyse générique utilisée.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Diagnostic principal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Diagnostic Principal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-xl text-blue-600">
              {diagnosis.primaryDiagnosis?.condition || "Diagnostic à préciser"}
            </h3>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="secondary">Probabilité: {diagnosis.primaryDiagnosis?.probability || 0}%</Badge>
              <Badge variant="outline">Sévérité: {diagnosis.primaryDiagnosis?.severity || "À évaluer"}</Badge>
            </div>
          </div>

          {diagnosis.primaryDiagnosis?.arguments && (
            <div>
              <h4 className="font-medium mb-2">Arguments diagnostiques:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                {diagnosis.primaryDiagnosis.arguments.map((arg: string, index: number) => (
                  <li key={index}>{arg}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Raisonnement clinique */}
      {diagnosis.clinicalReasoning && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Raisonnement Clinique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {diagnosis.clinicalReasoning.semiology && (
              <div>
                <h4 className="font-medium mb-2">Analyse sémiologique:</h4>
                <p className="text-sm text-gray-600">{diagnosis.clinicalReasoning.semiology}</p>
              </div>
            )}

            {diagnosis.clinicalReasoning.syndromes && (
              <div>
                <h4 className="font-medium mb-2">Syndromes identifiés:</h4>
                <div className="flex flex-wrap gap-2">
                  {diagnosis.clinicalReasoning.syndromes.map((syndrome: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {syndrome}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Diagnostics différentiels */}
      {diagnosis.differentialDiagnosis && diagnosis.differentialDiagnosis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Diagnostics Différentiels</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {diagnosis.differentialDiagnosis.map((diff: any, index: number) => (
                <div key={index} className="border-l-4 border-gray-200 pl-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{diff.condition}</h4>
                    <Badge variant="secondary">{diff.probability}%</Badge>
                  </div>
                  {diff.arguments && <p className="text-sm text-gray-600 mt-1">{diff.arguments.join(", ")}</p>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Examens recommandés */}
      {diagnosis.recommendedExams && diagnosis.recommendedExams.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Examens Complémentaires Recommandés</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {diagnosis.recommendedExams.map((exam: any, index: number) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{exam.exam}</h4>
                    <Badge variant={exam.urgency === "Immédiate" ? "destructive" : "secondary"}>{exam.urgency}</Badge>
                  </div>
                  <p className="text-sm text-gray-600">{exam.indication}</p>
                  <Badge variant="outline" className="mt-2">
                    {exam.category}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stratégie thérapeutique */}
      {diagnosis.therapeuticStrategy && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stratégie Thérapeutique</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {diagnosis.therapeuticStrategy.immediate && (
              <div>
                <h4 className="font-medium mb-2">Prise en charge immédiate:</h4>
                <div className="space-y-2">
                  {diagnosis.therapeuticStrategy.immediate.map((treatment: any, index: number) => (
                    <div key={index} className="bg-blue-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{treatment.treatment}</span>
                        <Badge variant="outline">{treatment.type}</Badge>
                      </div>
                      <p className="text-sm text-gray-600">{treatment.indication}</p>
                      {treatment.duration && <p className="text-xs text-gray-500 mt-1">Durée: {treatment.duration}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Signaux d'alarme */}
      {diagnosis.redFlags && diagnosis.redFlags.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-lg text-red-600">Signaux d'Alarme</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {diagnosis.redFlags.map((flag: string, index: number) => (
                <div key={index} className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{flag}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux Questions IA
        </Button>
        <Button onClick={onNext}>
          Continuer vers les Prescriptions
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
