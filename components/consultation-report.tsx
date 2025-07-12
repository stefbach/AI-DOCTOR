"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  FileText,
  Download,
  Printer,
  ArrowLeft,
  CheckCircle,
  User,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Stethoscope,
  Brain,
  Pill,
  TestTube,
  FileCheck,
} from "lucide-react"

interface ConsultationReportProps {
  patientData: any
  clinicalData: any
  questionsData: any
  diagnosisData: any
  examsData: any
  medicationsData: any
  onBack: () => void
  onComplete: () => void
}

export default function ConsultationReport({
  patientData,
  clinicalData,
  questionsData,
  diagnosisData,
  examsData,
  medicationsData,
  onBack,
  onComplete,
}: ConsultationReportProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [reportGenerated, setReportGenerated] = useState(false)

  const generateReport = async () => {
    setIsGenerating(true)
    // Simulation de génération de rapport
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setReportGenerated(true)
    setIsGenerating(false)
  }

  const downloadReport = () => {
    const reportContent = generateReportContent()
    const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `Compte-rendu_${patientData.lastName}_${patientData.firstName}_${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const printReport = () => {
    const printContent = generatePrintableReport()
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const generateReportContent = (): string => {
    const currentDate = new Date().toLocaleDateString("fr-FR")
    const currentTime = new Date().toLocaleTimeString("fr-FR")

    return `
COMPTE-RENDU DE CONSULTATION MÉDICALE
=====================================

Date de consultation: ${currentDate} à ${currentTime}
Généré par: Medical AI Expert System

INFORMATIONS PATIENT
-------------------
Nom: ${patientData.lastName}
Prénom: ${patientData.firstName}
Date de naissance: ${patientData.dateOfBirth}
Âge: ${patientData.age} ans
Sexe: ${patientData.gender}
Adresse: ${patientData.address}
Téléphone: ${patientData.phone}
Email: ${patientData.email}

Antécédents médicaux: ${patientData.medicalHistory || "Aucun"}
Médicaments actuels: ${patientData.currentMedications || "Aucun"}
Allergies: ${patientData.allergies || "Aucune connue"}

MOTIF DE CONSULTATION
--------------------
${clinicalData.chiefComplaint}

HISTOIRE DE LA MALADIE ACTUELLE
-------------------------------
${clinicalData.historyOfPresentIllness}

EXAMEN CLINIQUE
--------------
Signes vitaux:
- Tension artérielle: ${clinicalData.vitalSigns?.bloodPressure || "Non mesurée"}
- Fréquence cardiaque: ${clinicalData.vitalSigns?.heartRate || "Non mesurée"} bpm
- Température: ${clinicalData.vitalSigns?.temperature || "Non mesurée"}°C
- Saturation O2: ${clinicalData.vitalSigns?.oxygenSaturation || "Non mesurée"}%
- Poids: ${clinicalData.vitalSigns?.weight || "Non mesuré"} kg
- Taille: ${clinicalData.vitalSigns?.height || "Non mesurée"} cm

Examen physique:
${clinicalData.physicalExamination}

ANAMNÈSE DIRIGÉE PAR IA
----------------------
${questionsData.responses?.map((r: any) => `- ${r.question}: ${r.answer}`).join("\n") || "Non disponible"}

DIAGNOSTIC (Généré par IA)
=========================
Diagnostic principal: ${diagnosisData.diagnosis.primary.condition}
Code ICD-10: ${diagnosisData.diagnosis.primary.icd10}
Niveau de confiance: ${diagnosisData.diagnosis.primary.confidence}%
Sévérité: ${diagnosisData.diagnosis.primary.severity}

Justification clinique:
${diagnosisData.diagnosis.primary.rationale}

Diagnostics différentiels:
${diagnosisData.diagnosis.differential?.map((d: any) => `- ${d.condition} (${d.probability}%): ${d.rationale}`).join("\n") || "Aucun"}

EXAMENS COMPLÉMENTAIRES PRESCRITS
=================================
${examsData?.selectedExams?.map((exam: any) => `- ${exam.name} (${exam.code}): ${exam.indication}`).join("\n") || "Aucun examen prescrit"}

PRESCRIPTIONS MÉDICAMENTEUSES
=============================
${medicationsData?.prescriptions?.map((med: any) => `- ${med.name} ${med.dosage} - ${med.frequency}\n  Indication: ${med.indication}\n  Durée: ${med.duration}`).join("\n\n") || "Aucune prescription"}

RECOMMANDATIONS
==============
${diagnosisData.recommendations?.medications?.map((rec: any) => `- ${rec.name}: ${rec.indication}`).join("\n") || "Aucune recommandation spécifique"}

RÉFÉRENCES SCIENTIFIQUES
=======================
${diagnosisData.pubmedReferences?.map((ref: any) => `- ${ref.title} (${ref.journal}, ${ref.year}) - PMID: ${ref.pmid}`).join("\n") || "Aucune référence"}

SUIVI
=====
Prochaine consultation: À programmer selon évolution
Surveillance: Selon recommandations spécifiques

---
Rapport généré automatiquement par Medical AI Expert
Système utilisant OpenAI GPT-4, FDA Database, RxNorm et PubMed
Date de génération: ${currentDate} ${currentTime}
`
  }

  const generatePrintableReport = (): string => {
    const reportContent = generateReportContent()
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Compte-rendu de consultation</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
        h1 { color: #2563eb; border-bottom: 2px solid #2563eb; }
        h2 { color: #1e40af; margin-top: 25px; }
        .header { text-align: center; margin-bottom: 30px; }
        .patient-info { background: #f8fafc; padding: 15px; border-radius: 8px; }
        .diagnosis { background: #ecfdf5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981; }
        pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
        @media print { body { margin: 0; } }
    </style>
</head>
<body>
    <pre>${reportContent}</pre>
</body>
</html>
`
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FileText className="w-6 h-6" />
            Compte-rendu de Consultation
          </CardTitle>
          <p className="text-gray-600">
            Synthèse complète de la consultation de {patientData.firstName} {patientData.lastName}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {!reportGenerated ? (
            <div className="text-center py-8">
              <Button
                onClick={generateReport}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Brain className="w-4 h-4 mr-2" />
                    Générer le Compte-rendu Complet
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Compte-rendu généré avec succès. Vous pouvez maintenant le télécharger ou l'imprimer.
                </AlertDescription>
              </Alert>

              {/* Informations Patient */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Informations Patient
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">
                          {patientData.firstName} {patientData.lastName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span>
                          {patientData.age} ans ({patientData.gender})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span>{patientData.address}</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <span>{patientData.phone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <span>{patientData.email}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Examen Clinique */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5" />
                    Examen Clinique
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Motif de consultation:</h4>
                      <p className="text-gray-700">{clinicalData.chiefComplaint}</p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Signes vitaux:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>TA: {clinicalData.vitalSigns?.bloodPressure || "Non mesurée"}</div>
                        <div>FC: {clinicalData.vitalSigns?.heartRate || "Non mesurée"} bpm</div>
                        <div>T°: {clinicalData.vitalSigns?.temperature || "Non mesurée"}°C</div>
                        <div>SpO2: {clinicalData.vitalSigns?.oxygenSaturation || "Non mesurée"}%</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Diagnostic IA */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Diagnostic IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-lg">{diagnosisData.diagnosis.primary.condition}</h4>
                      <Badge variant="outline">Confiance: {diagnosisData.diagnosis.primary.confidence}%</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">Code ICD-10: {diagnosisData.diagnosis.primary.icd10}</p>
                    <p className="text-sm">{diagnosisData.diagnosis.primary.rationale}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Examens Prescrits */}
              {examsData?.selectedExams && examsData.selectedExams.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TestTube className="w-5 h-5" />
                      Examens Complémentaires
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {examsData.selectedExams.map((exam: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div>
                            <h4 className="font-medium">{exam.name}</h4>
                            <p className="text-sm text-gray-600">{exam.indication}</p>
                          </div>
                          <Badge variant="outline">{exam.code}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Prescriptions */}
              {medicationsData?.prescriptions && medicationsData.prescriptions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Pill className="w-5 h-5" />
                      Prescriptions Médicamenteuses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {medicationsData.prescriptions.map((med: any, index: number) => (
                        <div key={index} className="p-3 border rounded">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">{med.name}</h4>
                            <Badge variant="secondary">{med.dosage}</Badge>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Fréquence: {med.frequency}</p>
                            <p>Durée: {med.duration}</p>
                            <p>Indication: {med.indication}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator />

              {/* Actions */}
              <div className="flex justify-between items-center">
                <Button variant="outline" onClick={onBack}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={downloadReport}>
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger
                  </Button>
                  <Button variant="outline" onClick={printReport}>
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimer
                  </Button>
                  <Button onClick={onComplete} className="bg-green-600 hover:bg-green-700">
                    <FileCheck className="w-4 h-4 mr-2" />
                    Terminer la Consultation
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
