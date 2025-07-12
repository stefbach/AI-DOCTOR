"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertCircle, Loader2, Play, ExternalLink } from "lucide-react"

interface SystemStatus {
  openai: "checking" | "success" | "error" | "not-checked"
  fda: "checking" | "success" | "error" | "not-checked"
  rxnorm: "checking" | "success" | "error" | "not-checked"
  pubmed: "checking" | "success" | "error" | "not-checked"
}

interface TestResult {
  service: string
  status: "success" | "error" | "warning"
  message: string
  responseTime?: number
  details?: string
}

export default function SystemCheck() {
  const [status, setStatus] = useState<SystemStatus>({
    openai: "not-checked",
    fda: "not-checked",
    rxnorm: "not-checked",
    pubmed: "not-checked",
  })

  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [isRunningFullTest, setIsRunningFullTest] = useState(false)
  const [showApiKeyHelp, setShowApiKeyHelp] = useState(false)

  const checkOpenAI = async () => {
    setStatus((prev) => ({ ...prev, openai: "checking" }))
    const startTime = Date.now()

    try {
      const response = await fetch("/api/openai-diagnosis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientData: {
            age: 30,
            gender: "Femme",
            allergies: "Aucune",
            medicalHistory: "RAS",
          },
          clinicalData: {
            chiefComplaint: "Test de connexion système",
            symptoms: ["Test"],
            vitalSigns: {
              temperature: "37.0",
              bloodPressure: "120/80",
              heartRate: "70",
              oxygenSaturation: "98",
            },
            physicalExam: "Test de connexion",
          },
          questionsData: {
            responses: [
              {
                question: "Test de connexion",
                answer: "Oui",
              },
            ],
          },
        }),
      })

      const responseTime = Date.now() - startTime
      const responseData = await response.json()

      if (response.ok) {
        setStatus((prev) => ({ ...prev, openai: "success" }))
        return {
          service: "OpenAI GPT-4",
          status: "success" as const,
          message: "✅ Connexion réussie et diagnostic généré",
          responseTime,
          details: `Modèle: ${responseData.metadata?.model || "gpt-4"}`,
        }
      } else {
        setStatus((prev) => ({ ...prev, openai: "error" }))

        // Détection des erreurs spécifiques
        let errorMessage = responseData.error || "Erreur inconnue"
        let details = ""

        if (errorMessage.includes("Incorrect API key") || errorMessage.includes("Invalid API key")) {
          errorMessage = "❌ Clé API OpenAI invalide"
          details = "Vous devez remplacer 'REMPLACEZ_PAR_VOTRE_VRAIE_CLE_OPENAI' par votre vraie clé"
          setShowApiKeyHelp(true)
        } else if (errorMessage.includes("API key manquante")) {
          errorMessage = "❌ Clé API OpenAI manquante"
          details = "Ajoutez OPENAI_API_KEY dans votre fichier .env.local"
          setShowApiKeyHelp(true)
        } else if (errorMessage.includes("quota")) {
          errorMessage = "❌ Quota OpenAI dépassé"
          details = "Vérifiez votre usage sur platform.openai.com"
        }

        return {
          service: "OpenAI GPT-4",
          status: "error" as const,
          message: errorMessage,
          details,
        }
      }
    } catch (error: any) {
      setStatus((prev) => ({ ...prev, openai: "error" }))
      return {
        service: "OpenAI GPT-4",
        status: "error" as const,
        message: "❌ Erreur de connexion",
        details: `Détails: ${error.message}`,
      }
    }
  }

  const checkFDA = async () => {
    setStatus((prev) => ({ ...prev, fda: "checking" }))
    const startTime = Date.now()

    try {
      const response = await fetch("/api/fda-drug-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drugName: "aspirin" }),
      })

      const responseTime = Date.now() - startTime

      if (response.ok) {
        const data = await response.json()
        setStatus((prev) => ({ ...prev, fda: "success" }))
        return {
          service: "FDA Database",
          status: "success" as const,
          message: "✅ Service disponible",
          responseTime,
          details: data.source === "api" ? "API officielle" : "Base locale",
        }
      } else {
        setStatus((prev) => ({ ...prev, fda: "error" }))
        return {
          service: "FDA Database",
          status: "warning" as const,
          message: "⚠️ Fallback local utilisé",
          details: "L'API FDA n'est pas disponible, mais le système fonctionne",
        }
      }
    } catch (error) {
      setStatus((prev) => ({ ...prev, fda: "error" }))
      return {
        service: "FDA Database",
        status: "warning" as const,
        message: "⚠️ Fallback local actif",
        details: "Base de données locale utilisée",
      }
    }
  }

  const checkRxNorm = async () => {
    setStatus((prev) => ({ ...prev, rxnorm: "checking" }))
    const startTime = Date.now()

    try {
      const response = await fetch("/api/rxnorm-normalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ drugName: "paracetamol" }),
      })

      const responseTime = Date.now() - startTime

      if (response.ok) {
        const data = await response.json()
        setStatus((prev) => ({ ...prev, rxnorm: "success" }))
        return {
          service: "RxNorm API",
          status: "success" as const,
          message: "✅ Normalisation active",
          responseTime,
          details: data.source === "api" ? "API officielle" : "Base locale",
        }
      } else {
        setStatus((prev) => ({ ...prev, rxnorm: "error" }))
        return {
          service: "RxNorm API",
          status: "warning" as const,
          message: "⚠️ Base locale utilisée",
          details: "Normalisation locale des médicaments",
        }
      }
    } catch (error) {
      setStatus((prev) => ({ ...prev, rxnorm: "error" }))
      return {
        service: "RxNorm API",
        status: "warning" as const,
        message: "⚠️ Fallback local actif",
        details: "Base de données locale utilisée",
      }
    }
  }

  const checkPubMed = async () => {
    setStatus((prev) => ({ ...prev, pubmed: "checking" }))
    const startTime = Date.now()

    try {
      const response = await fetch("/api/pubmed-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: "hypertension", maxResults: 1 }),
      })

      const responseTime = Date.now() - startTime

      if (response.ok) {
        const data = await response.json()
        setStatus((prev) => ({ ...prev, pubmed: "success" }))
        return {
          service: "PubMed API",
          status: "success" as const,
          message: "✅ Recherche scientifique active",
          responseTime,
          details: `${data.articles?.length || 0} articles trouvés`,
        }
      } else {
        setStatus((prev) => ({ ...prev, pubmed: "error" }))
        return {
          service: "PubMed API",
          status: "warning" as const,
          message: "⚠️ Base locale utilisée",
          details: "Articles scientifiques locaux",
        }
      }
    } catch (error) {
      setStatus((prev) => ({ ...prev, pubmed: "error" }))
      return {
        service: "PubMed API",
        status: "warning" as const,
        message: "⚠️ Fallback local actif",
        details: "Base de données locale utilisée",
      }
    }
  }

  const runFullSystemCheck = async () => {
    setIsRunningFullTest(true)
    setTestResults([])
    setShowApiKeyHelp(false)

    const results = await Promise.all([checkOpenAI(), checkFDA(), checkRxNorm(), checkPubMed()])

    setTestResults(results)
    setIsRunningFullTest(false)
  }

  const getStatusIcon = (serviceStatus: SystemStatus[keyof SystemStatus]) => {
    switch (serviceStatus) {
      case "checking":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (serviceStatus: SystemStatus[keyof SystemStatus]) => {
    switch (serviceStatus) {
      case "checking":
        return <Badge variant="secondary">Test en cours...</Badge>
      case "success":
        return (
          <Badge variant="default" className="bg-green-500">
            ✓ Opérationnel
          </Badge>
        )
      case "error":
        return <Badge variant="destructive">✗ Erreur</Badge>
      default:
        return <Badge variant="outline">Non testé</Badge>
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Vérification du Système Medical AI Expert
          </CardTitle>
          <CardDescription>
            Vérifiez que toutes les APIs sont correctement configurées et fonctionnelles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={runFullSystemCheck} disabled={isRunningFullTest} className="w-full">
            {isRunningFullTest ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Test en cours...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Lancer la Vérification Complète
              </>
            )}
          </Button>

          {showApiKeyHelp && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="space-y-3">
                <div className="font-medium text-orange-800">🔑 Configuration de la clé OpenAI requise</div>
                <div className="space-y-2 text-sm">
                  <p>
                    <strong>1. Obtenez votre clé OpenAI :</strong>
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open("https://platform.openai.com/api-keys", "_blank")}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Aller sur OpenAI Platform
                    </Button>
                  </div>

                  <p>
                    <strong>2. Copiez votre clé et remplacez dans .env.local :</strong>
                  </p>
                  <div className="bg-gray-100 p-2 rounded font-mono text-xs">
                    OPENAI_API_KEY=sk-proj-votre-vraie-cle-ici
                  </div>

                  <p>
                    <strong>3. Redémarrez l'application :</strong>
                  </p>
                  <div className="bg-gray-100 p-2 rounded font-mono text-xs">npm run dev</div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              className={
                status.openai === "success" ? "border-green-200" : status.openai === "error" ? "border-red-200" : ""
              }
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status.openai)}
                    <span className="font-medium">OpenAI GPT-4</span>
                  </div>
                  {getStatusBadge(status.openai)}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  <strong>Service principal</strong> pour le diagnostic IA (OBLIGATOIRE)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status.fda)}
                    <span className="font-medium">FDA Database</span>
                  </div>
                  {getStatusBadge(status.fda)}
                </div>
                <p className="text-sm text-muted-foreground mt-2">Informations médicamenteuses (optionnel)</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status.rxnorm)}
                    <span className="font-medium">RxNorm API</span>
                  </div>
                  {getStatusBadge(status.rxnorm)}
                </div>
                <p className="text-sm text-muted-foreground mt-2">Normalisation des médicaments (optionnel)</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(status.pubmed)}
                    <span className="font-medium">PubMed API</span>
                  </div>
                  {getStatusBadge(status.pubmed)}
                </div>
                <p className="text-sm text-muted-foreground mt-2">Recherche scientifique (optionnel)</p>
              </CardContent>
            </Card>
          </div>

          {testResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Résultats des Tests</h3>
              {testResults.map((result, index) => (
                <Alert
                  key={index}
                  className={
                    result.status === "success"
                      ? "border-green-200 bg-green-50"
                      : result.status === "warning"
                        ? "border-orange-200 bg-orange-50"
                        : "border-red-200 bg-red-50"
                  }
                >
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {result.status === "success" ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : result.status === "warning" ? (
                            <AlertCircle className="h-4 w-4 text-orange-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="font-medium">{result.service}</span>
                        </div>
                        {result.responseTime && (
                          <Badge variant="outline" className="text-xs">
                            {result.responseTime}ms
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm">
                        <div>{result.message}</div>
                        {result.details && <div className="text-muted-foreground mt-1">{result.details}</div>}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important :</strong> Seule l'API OpenAI est obligatoire pour le fonctionnement. Les autres
              services ont des fallbacks locaux intégrés et fonctionnent même en cas d'erreur.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
