"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  FileText,
  Stethoscope,
  FlaskConical,
  Pill,
  BookOpen,
  Download,
  PrinterIcon as Print,
  CheckCircle,
} from "lucide-react"

interface WorkflowResult {
  diagnosis: string
  examens: string
  prescription: string
  pubmedEvidence: any
  fdaVerification: any
  consultationReport: string
}

interface IntegratedMedicalConsultationProps {
  patientData: any
  result: WorkflowResult
}

export default function IntegratedMedicalConsultation({ patientData, result }: IntegratedMedicalConsultationProps) {
  const [activeTab, setActiveTab] = useState("rapport")

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    const reportContent = `
CONSULTATION MÉDICALE COMPLÈTE
==============================

PATIENT: ${patientData.firstName} ${patientData.lastName}
ÂGE: ${patientData.age} ans
DATE: ${new Date().toLocaleDateString("fr-FR")}

${result.consultationReport}

DIAGNOSTIC DÉTAILLÉ
==================
${result.diagnosis}

EXAMENS COMPLÉMENTAIRES
======================
${result.examens}

PRESCRIPTION MÉDICAMENTEUSE
==========================
${result.prescription}

RÉFÉRENCES SCIENTIFIQUES
========================
Articles PubMed consultés: ${result.pubmedEvidence?.articles?.length || 0}
Vérification FDA: ${result.fdaVerification?.success ? "Validée" : "À vérifier"}

Généré par TIBOK IA DOCTOR le ${new Date().toLocaleString("fr-FR")}
    `

    const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `consultation-complete-${patientData.lastName}-${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const parseDiagnosis = (diagnosisText: string) => {
    const lines = diagnosisText.split("\n").filter((line) => line.trim())
    const principal = lines.find((line) => line.includes("principal") || line.includes("probable"))
    const confidence = lines.find((line) => line.includes("%") || line.includes("confiance"))
    const differentiels = lines.filter((line) => line.includes("différentiel") || line.match(/^\d+\./))

    return {
      principal: principal || lines[0] || "Diagnostic en cours d'analyse",
      confidence: confidence || "Confiance: En évaluation",
      differentiels: differentiels.slice(0, 3),
    }
  }

  const parseExamens = (examensText: string) => {
    const sections = examensText.split("\n").filter((line) => line.trim())
    const biologie = sections.filter(
      (line) =>
        line.toLowerCase().includes("biolog") ||
        line.toLowerCase().includes("sang") ||
        line.toLowerCase().includes("urine"),
    )
    const imagerie = sections.filter(
      (line) =>
        line.toLowerCase().includes("radio") ||
        line.toLowerCase().includes("scanner") ||
        line.toLowerCase().includes("irm") ||
        line.toLowerCase().includes("echo"),
    )

    return { biologie, imagerie }
  }

  const parsePrescription = (prescriptionText: string) => {
    const lines = prescriptionText.split("\n").filter((line) => line.trim())
    const medicaments = lines.filter(
      (line) => line.includes("mg") || line.includes("comprimé") || line.includes("gélule") || line.match(/^\d+\./),
    )

    return medicaments.slice(0, 5)
  }

  const diagnosis = parseDiagnosis(result.diagnosis)
  const examens = parseExamens(result.examens)
  const medicaments = parsePrescription(result.prescription)

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Consultation Médicale Complète - {patientData.firstName} {patientData.lastName}
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Print className="h-4 w-4 mr-2" />
                Imprimer
              </Button>
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Date: {new Date().toLocaleDateString("fr-FR")}</span>
            <span>•</span>
            <span>Âge: {patientData.age} ans</span>
            <span>•</span>
            <span>Sexe: {patientData.gender}</span>
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Analyse IA Complétée
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Contenu principal avec onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="rapport" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Rapport
          </TabsTrigger>
          <TabsTrigger value="diagnostic" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Diagnostic
          </TabsTrigger>
          <TabsTrigger value="examens" className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Examens
          </TabsTrigger>
          <TabsTrigger value="prescription" className="flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Prescription
          </TabsTrigger>
          <TabsTrigger value="evidence" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Evidence
          </TabsTrigger>
        </TabsList>

        {/* Rapport complet */}
        <TabsContent value="rapport">
          <Card>
            <CardHeader>
              <CardTitle>Compte-Rendu de Consultation</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{result.consultationReport}</div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diagnostic détaillé */}
        <TabsContent value="diagnostic">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Diagnostic Principal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900">Diagnostic le plus probable</h4>
                    <p className="text-blue-800 mt-1">{diagnosis.principal}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium">{diagnosis.confidence}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Diagnostics Différentiels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {diagnosis.differentiels.map((diff, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <p className="text-sm">{diff}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analyse Complète IA</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="whitespace-pre-wrap text-sm">{result.diagnosis}</div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Examens paracliniques */}
        <TabsContent value="examens">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FlaskConical className="h-5 w-5" />
                    Examens Biologiques
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {examens.biologie.length > 0 ? (
                      examens.biologie.map((exam, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                          {exam}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">Aucun examen biologique spécifique recommandé</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Imagerie Médicale
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {examens.imagerie.length > 0 ? (
                      examens.imagerie.map((exam, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                          {exam}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">Aucune imagerie spécifique recommandée</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recommandations Complètes</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="whitespace-pre-wrap text-sm">{result.examens}</div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Prescription */}
        <TabsContent value="prescription">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Ordonnance Médicamenteuse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {medicaments.length > 0 ? (
                    medicaments.map((med, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <p className="font-medium text-sm">{med}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">Aucun médicament spécifique prescrit</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vérification FDA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {result.fdaVerification?.success ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-700">Médicaments vérifiés FDA</span>
                    </>
                  ) : (
                    <>
                      <Badge variant="secondary">En cours de vérification</Badge>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prescription Complète</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="whitespace-pre-wrap text-sm">{result.prescription}</div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Evidence scientifique */}
        <TabsContent value="evidence">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Références Scientifiques PubMed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">Articles trouvés: {result.pubmedEvidence?.articles?.length || 0}</Badge>
                    <Badge variant="outline">Base de données: PubMed</Badge>
                  </div>

                  {result.pubmedEvidence?.articles?.length > 0 ? (
                    <div className="space-y-2">
                      {result.pubmedEvidence.articles.slice(0, 5).map((article: any, index: number) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <h4 className="font-medium text-sm">{article.title || `Article ${index + 1}`}</h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {article.authors || "Auteurs non spécifiés"} • {article.journal || "Journal non spécifié"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">Aucun article PubMed trouvé pour ce cas</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vérifications Réglementaires</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">FDA Drug Database</span>
                    <Badge variant={result.fdaVerification?.success ? "default" : "secondary"}>
                      {result.fdaVerification?.success ? "✓ Vérifié" : "En cours"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">RxNorm Normalization</span>
                    <Badge variant="secondary">Disponible</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Drug Interactions Check</span>
                    <Badge variant="secondary">Intégré</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
