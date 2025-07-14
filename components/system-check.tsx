"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, Loader2, Play, RefreshCw } from "lucide-react"

interface SystemStatus {
  service: string
  status: "success" | "error" | "warning" | "loading"
  message: string
  details?: string
  responseTime?: number
}

export default function SystemCheck() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus[]>([])
  const [isRunning, setIsRunning] = useState(false)

  const runSystemCheck = async () => {
    setIsRunning(true)
    setSystemStatus([])

    const services = [
      { name: "OpenAI API", endpoint: "/api/openai-diagnosis", testData: getTestData() },
      { name: "FDA Drug Info", endpoint: "/api/fda-drug-info", testData: getTestData() },
      { name: "PubMed Search", endpoint: "/api/pubmed-search", testData: getTestData() },
      {
        name: "RxNorm Normalize",
        endpoint: "/api/rxnorm-normalize",
        testData: { medications: ["paracétamol", "ibuprofène"] },
      },
      { name: "Questions Generator", endpoint: "/api/openai-questions", testData: getTestData() },
    ]

    for (const service of services) {
      setSystemStatus((prev) => [
        ...prev,
        {
          service: service.name,
          status: "loading",
          message: "Test en cours...",
        },
      ])

      try {
        const startTime = Date.now()
        const response = await fetch(service.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(service.testData),
        })

        const responseTime = Date.now() - startTime
        const data = await response.json()

        setSystemStatus((prev) =>
          prev.map((status) =>
            status.service === service.name
              ? {
                  service: service.name,
                  status: response.ok ? "success" : "error",
                  message: response.ok ? "Service opérationnel" : `Erreur ${response.status}`,
                  details: response.ok ? `Réponse en ${responseTime}ms` : data.error || "Erreur inconnue",
                  responseTime,
                }
              : status,
          ),
        )
      } catch (error) {
        setSystemStatus((prev) =>
          prev.map((status) =>
            status.service === service.name
              ? {
                  service: service.name,
                  status: "error",
                  message: "Erreur de connexion",
                  details: error instanceof Error ? error.message : "Erreur inconnue",
                }
              : status,
          ),
        )
      }
    }

    setIsRunning(false)
  }

  const getTestData = () => ({
    patientData: {
      age: 45,
      sex: "M",
      medicalHistory: ["Hypertension"],
      currentMedications: ["Lisinopril 10mg"],
      allergies: [],
    },
    clinicalData: {
      symptoms: ["Douleur thoracique", "Essoufflement"],
      physicalExam: "Examen normal",
      vitalSigns: {
        bloodPressure: "140/90",
        heartRate: 80,
        temperature: 37.0,
      },
    },
  })

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-600" />
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case "loading":
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800 border-green-200">Opérationnel</Badge>
      case "error":
        return <Badge className="bg-red-100 text-red-800 border-red-200">Erreur</Badge>
      case "warning":
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Attention</Badge>
      case "loading":
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Test...</Badge>
      default:
        return <Badge variant="outline">Inconnu</Badge>
    }
  }

  const getOverallStatus = () => {
    if (systemStatus.length === 0) return "unknown"
    if (systemStatus.some((s) => s.status === "loading")) return "loading"
    if (systemStatus.some((s) => s.status === "error")) return "error"
    if (systemStatus.some((s) => s.status === "warning")) return "warning"
    if (systemStatus.every((s) => s.status === "success")) return "success"
    return "unknown"
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Vérification du Système</span>
            <div className="flex gap-2">
              {getStatusBadge(getOverallStatus())}
              <Button onClick={runSystemCheck} disabled={isRunning} size="sm">
                {isRunning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                {isRunning ? "Test en cours..." : "Lancer les tests"}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 mb-4">Vérification de l'état de tous les services du système médical expert</p>

          {systemStatus.length === 0 && !isRunning && (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Aucun test effectué</p>
              <Button onClick={runSystemCheck}>
                <Play className="h-4 w-4 mr-2" />
                Démarrer la vérification
              </Button>
            </div>
          )}

          {systemStatus.length > 0 && (
            <div className="space-y-4">
              {systemStatus.map((status, index) => (
                <Card key={index} className="border-l-4 border-l-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(status.status)}
                        <div>
                          <h4 className="font-medium">{status.service}</h4>
                          <p className="text-sm text-gray-600">{status.message}</p>
                          {status.details && <p className="text-xs text-gray-500 mt-1">{status.details}</p>}
                        </div>
                      </div>
                      <div className="text-right">
                        {getStatusBadge(status.status)}
                        {status.responseTime && <p className="text-xs text-gray-500 mt-1">{status.responseTime}ms</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {systemStatus.length > 0 && !isRunning && (
            <div className="mt-6 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">
                    Tests terminés • {systemStatus.filter((s) => s.status === "success").length}/{systemStatus.length}{" "}
                    services opérationnels
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={runSystemCheck}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Relancer
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Informations système */}
      <Card>
        <CardHeader>
          <CardTitle>Informations Système</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">Services Intégrés</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• OpenAI GPT-4 pour diagnostic IA</li>
                <li>• FDA Drug Database pour sécurité médicamenteuse</li>
                <li>• PubMed pour recherche scientifique</li>
                <li>• RxNorm pour normalisation pharmaceutique</li>
                <li>• Générateur de questions intelligentes</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">Fonctionnalités</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Diagnostic différentiel automatisé</li>
                <li>• Détection d'interactions médicamenteuses</li>
                <li>• Recommandations basées sur l'evidence</li>
                <li>• Questionnaire adaptatif intelligent</li>
                <li>• Intégration données externes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
