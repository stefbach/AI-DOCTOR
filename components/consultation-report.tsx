"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, FileText, Download, Printer, Brain, CheckCircle, AlertTriangle } from "lucide-react"

interface ConsultationReportProps {
  allData?: any
  onDataChange?: (data: any) => void
}

interface ReportData {
  title: string
  content: string
  sections: {
    motifConsultation: string
    antecedents: string
    examenClinique: string
    diagnostic: string
    examensComplementaires: string
    traitement: string
    surveillance: string
    conclusion: string
  }
  medicalReferences?: string[]
  generatedBy: string
  generatedAt: string
  patientInfo: {
    name: string
    age: string
    gender: string
  }
}

export default function ConsultationReport({ allData, onDataChange }: ConsultationReportProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reportGenerated, setReportGenerated] = useState(false)

  // Auto-génération du rapport quand toutes les données sont disponibles
  useEffect(() => {
    const shouldGenerate =
      !reportGenerated &&
      !isGenerating &&
      allData &&
      allData.patientData &&
      allData.clinicalData &&
      allData.diagnosisData &&
      !reportData?.generatedAt

    if (shouldGenerate) {
      console.log("📋 Auto-génération du rapport de consultation...")
      generateReport()
    }
  }, [allData, reportGenerated, isGenerating, reportData?.generatedAt])

  const generateReport = async () => {
    if (isGenerating) return

    setIsGenerating(true)
    setError(null)

    try {
      console.log("📋 Génération rapport avec données complètes:", allData)

      const response = await fetch("/api/generate-consultation-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ allData }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erreur API: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log("✅ Rapport généré:", result)

      if (result.success && result.data) {
        setReportData(result.data)
        setReportGenerated(true)
        if (onDataChange) {
          onDataChange({ consultationReport: result.data })
        }
      } else {
        throw new Error(result.error || "Erreur lors de la génération du rapport")
      }
    } catch (error) {
      console.error("❌ Erreur génération rapport:", error)
      setError(error instanceof Error ? error.message : "Erreur inconnue")

      // Rapport de fallback
      const fallbackReport: ReportData = {
        title: "Compte-Rendu de Consultation Médicale",
        content: generateFallbackReport(allData),
        sections: {
          motifConsultation: allData?.clinicalData?.chiefComplaint || "Consultation médicale",
          antecedents: allData?.clinicalData?.medicalHistory || "À compléter",
          examenClinique: "Examen clinique à documenter",
          diagnostic:
            allData?.diagnosisData?.data?.comprehensiveDiagnosis?.primary?.condition || "Diagnostic à préciser",
          examensComplementaires: "Examens complémentaires selon indication",
          traitement: "Traitement selon protocole",
          surveillance: "Surveillance clinique recommandée",
          conclusion: "Suivi médical nécessaire",
        },
        generatedBy: "Système de fallback",
        generatedAt: new Date().toISOString(),
        patientInfo: {
          name: `${allData?.patientData?.firstName || "Prénom"} ${allData?.patientData?.lastName || "Nom"}`,
          age: allData?.patientData?.age?.toString() || "XX",
          gender: allData?.patientData?.gender || "Non spécifié",
        },
      }

      setReportData(fallbackReport)
      setReportGenerated(true)
    } finally {
      setIsGenerating(false)
    }
  }

  const generateFallbackReport = (data: any): string => {
    const patientName = `${data?.patientData?.firstName || "Prénom"} ${data?.patientData?.lastName || "Nom"}`
    const today = new Date().toLocaleDateString("fr-FR")

    return `COMPTE-RENDU DE CONSULTATION MÉDICALE

Date: ${today}
Patient: ${patientName}
Âge: ${data?.patientData?.age || "XX"} ans
Sexe: ${data?.patientData?.gender || "Non spécifié"}

MOTIF DE CONSULTATION:
${data?.clinicalData?.chiefComplaint || "Consultation médicale"}

ANTÉCÉDENTS:
${data?.clinicalData?.medicalHistory || "À compléter"}

EXAMEN CLINIQUE:
Examen physique à documenter selon les données collectées.

DIAGNOSTIC:
${data?.diagnosisData?.data?.comprehensiveDiagnosis?.primary?.condition || "Diagnostic à préciser"}

EXAMENS COMPLÉMENTAIRES:
Selon indication clinique et protocole établi.

TRAITEMENT:
Selon protocole thérapeutique adapté.

SURVEILLANCE:
Surveillance clinique recommandée avec suivi médical.

CONCLUSION:
Suivi médical nécessaire selon évolution clinique.

Rapport généré automatiquement - ${new Date().toISOString()}`
  }

  const downloadReport = () => {
    if (!reportData) return

    const element = document.createElement("a")
    const file = new Blob([reportData.content], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `Consultation_Report_${reportData.patientInfo.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const printReport = () => {
    if (!reportData) return

    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${reportData.title}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
                line-height: 1.6; 
                color: #333;
              }
              .header {
                text-align: center;
                border-bottom: 2px solid #333;
                padding-bottom: 10px;
                margin-bottom: 20px;
              }
              .section {
                margin-bottom: 20px;
                padding: 10px;
                border-left: 4px solid #007bff;
                background-color: #f8f9fa;
              }
              .section-title {
                font-weight: bold;
                color: #007bff;
                margin-bottom: 10px;
                text-transform: uppercase;
              }
              .patient-info {
                background-color: #e9ecef;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
              }
              .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #ccc;
                font-size: 12px;
                color: #666;
              }
              @media print {
                body { margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>${reportData.title}</h1>
              <p>Date: ${new Date(reportData.generatedAt).toLocaleDateString("fr-FR")}</p>
            </div>
            
            <div class="patient-info">
              <strong>Patient:</strong> ${reportData.patientInfo.name}<br>
              <strong>Âge:</strong> ${reportData.patientInfo.age} ans<br>
              <strong>Sexe:</strong> ${reportData.patientInfo.gender}
            </div>

            <div class="section">
              <div class="section-title">Motif de Consultation</div>
              <div>${reportData.sections.motifConsultation}</div>
            </div>

            <div class="section">
              <div class="section-title">Antécédents</div>
              <div>${reportData.sections.antecedents}</div>
            </div>

            <div class="section">
              <div class="section-title">Examen Clinique</div>
              <div>${reportData.sections.examenClinique}</div>
            </div>

            <div class="section">
              <div class="section-title">Diagnostic</div>
              <div>${reportData.sections.diagnostic}</div>
            </div>

            <div class="section">
              <div class="section-title">Examens Complémentaires</div>
              <div>${reportData.sections.examensComplementaires}</div>
            </div>

            <div class="section">
              <div class="section-title">Traitement</div>
              <div>${reportData.sections.traitement}</div>
            </div>

            <div class="section">
              <div class="section-title">Surveillance</div>
              <div>${reportData.sections.surveillance}</div>
            </div>

            <div class="section">
              <div class="section-title">Conclusion</div>
              <div>${reportData.sections.conclusion}</div>
            </div>

            ${
              reportData.medicalReferences && reportData.medicalReferences.length > 0
                ? `
            <div class="section">
              <div class="section-title">Références Médicales</div>
              <ul>
                ${reportData.medicalReferences.map((ref) => `<li>${ref}</li>`).join("")}
              </ul>
            </div>
            `
                : ""
            }

            <div class="footer">
              <p><strong>Rapport généré par:</strong> ${reportData.generatedBy}</p>
              <p><strong>Date de génération:</strong> ${new Date(reportData.generatedAt).toLocaleString("fr-FR")}</p>
            </div>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  // État de génération
  if (isGenerating) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex items-center justify-center mb-4">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Génération du Rapport de Consultation</h3>
            <p className="text-gray-600 mb-4">L'IA rédige un compte-rendu médical professionnel...</p>
            <div className="space-y-2">
              <div className="text-sm text-gray-500">Rédaction en cours...</div>
              <div className="text-xs text-gray-400">Intégration des données patient, diagnostic et traitement</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // État d'erreur
  if (error && !reportData) {
    return (
      <div className="space-y-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error} - Utilisation du rapport de fallback</AlertDescription>
        </Alert>
        <div className="flex justify-center">
          <Button onClick={generateReport} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Génération...
              </>
            ) : (
              "Régénérer le Rapport"
            )}
          </Button>
        </div>
      </div>
    )
  }

  // État initial
  if (!reportData) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 mx-auto mb-4 text-blue-600" />
            <h3 className="text-lg font-semibold mb-2">Rapport de Consultation</h3>
            <p className="text-gray-600 mb-4">Prêt à générer le compte-rendu médical</p>
            <Button onClick={generateReport} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Générer le Rapport
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Affichage du rapport généré
  return (
    <div className="space-y-6">
      {/* En-tête du rapport */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              {reportData.title}
            </CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={downloadReport}>
                <Download className="h-4 w-4 mr-1" />
                Télécharger
              </Button>
              <Button size="sm" variant="outline" onClick={printReport}>
                <Printer className="h-4 w-4 mr-1" />
                Imprimer
              </Button>
              <Button size="sm" variant="outline" onClick={generateReport} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Brain className="h-4 w-4 mr-1" />}
                Régénérer avec IA
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-sm font-medium text-gray-600">Patient</div>
              <div className="font-semibold">{reportData.patientInfo.name}</div>
              <div className="text-sm text-gray-500">
                {reportData.patientInfo.age} ans - {reportData.patientInfo.gender}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Généré par</div>
              <div className="font-semibold">{reportData.generatedBy}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-600">Date</div>
              <div className="font-semibold">{new Date(reportData.generatedAt).toLocaleDateString("fr-FR")}</div>
              <div className="text-sm text-gray-500">
                {new Date(reportData.generatedAt).toLocaleTimeString("fr-FR")}
              </div>
            </div>
          </div>

          {error && (
            <Alert className="mb-4 border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">{error} - Rapport généré en mode dégradé</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Sections du rapport */}
      <div className="grid gap-4">
        {Object.entries(reportData.sections).map(([key, content]) => {
          const sectionTitles: Record<string, string> = {
            motifConsultation: "Motif de Consultation",
            antecedents: "Antécédents",
            examenClinique: "Examen Clinique",
            diagnostic: "Diagnostic",
            examensComplementaires: "Examens Complémentaires",
            traitement: "Traitement",
            surveillance: "Surveillance",
            conclusion: "Conclusion",
          }

          return (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="text-base">{sectionTitles[key] || key}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-gray-700">{content}</div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Références médicales */}
      {reportData.medicalReferences && reportData.medicalReferences.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Références Médicales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {reportData.medicalReferences.map((reference, index) => (
                <li key={index} className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{reference}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Métadonnées */}
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <Badge variant="secondary" className="mr-2">
                Rapport Médical Professionnel
              </Badge>
              <Badge variant="secondary">Généré par IA</Badge>
            </div>
            <div>ID: {reportData.generatedAt.split("T")[0]}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
