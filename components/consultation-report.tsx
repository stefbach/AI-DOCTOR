"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  FileText,
  Download,
  Printer,
  CheckCircle,
  Calendar,
  User,
  Stethoscope,
  Brain,
  Pill,
  TestTube,
  ArrowLeft,
} from "lucide-react"

interface ConsultationReportProps {
  data?: any
  allData?: any
  onDataChange: (data: any) => void
  onNext: () => void
  onPrevious: () => void
}

export default function ConsultationReport({
  data,
  allData,
  onDataChange,
  onNext,
  onPrevious,
}: ConsultationReportProps) {
  const [reportData, setReportData] = useState<any>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  useEffect(() => {
    if (!reportData && allData) {
      generateReport()
    }
  }, [allData])

  const generateReport = () => {
    setIsGenerating(true)

    const report = {
      header: {
        title: "RAPPORT DE CONSULTATION MÉDICALE",
        date: new Date().toLocaleDateString("fr-FR"),
        time: new Date().toLocaleTimeString("fr-FR"),
        doctorName: "Dr. Medical AI Expert",
        patientName: `${allData?.patientData?.firstName || ""} ${allData?.patientData?.lastName || ""}`.trim(),
      },
      patientInfo: {
        age: allData?.patientData?.age,
        gender: allData?.patientData?.gender,
        weight: allData?.patientData?.weight,
        height: allData?.patientData?.height,
        allergies: allData?.patientData?.allergies,
        medicalHistory: allData?.patientData?.medicalHistory,
      },
      consultation: {
        chiefComplaint: allData?.clinicalData?.chiefComplaint,
        symptoms: allData?.clinicalData?.symptoms,
        vitalSigns: allData?.clinicalData?.vitalSigns,
        physicalExam: allData?.clinicalData?.physicalExam,
      },
      anamnesis: allData?.questionsData?.answers || {},
      diagnosis: allData?.diagnosisData?.diagnosis || null,
      examinations: allData?.examsData?.selectedExams || [],
      prescriptions: allData?.prescriptionData?.medications || [],
      recommendations: allData?.diagnosisData?.recommendations || {},
      followUp: allData?.diagnosisData?.followUp || "Suivi selon évolution",
      generatedAt: new Date().toISOString(),
    }

    setReportData(report)
    onDataChange(report)
    setIsGenerating(false)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    const reportText = generateTextReport()
    const blob = new Blob([reportText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `rapport-consultation-${reportData?.header?.patientName?.replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const generateTextReport = () => {
    if (!reportData) return ""

    return `
${reportData.header.title}
${"=".repeat(50)}

Date: ${reportData.header.date} à ${reportData.header.time}
Médecin: ${reportData.header.doctorName}
Patient: ${reportData.header.patientName}

INFORMATIONS PATIENT
${"=".repeat(20)}
Âge: ${reportData.patientInfo.age} ans
Sexe: ${reportData.patientInfo.gender}
Poids: ${reportData.patientInfo.weight || "Non renseigné"} kg
Taille: ${reportData.patientInfo.height || "Non renseigné"} cm
Allergies: ${reportData.patientInfo.allergies || "Aucune connue"}
Antécédents: ${reportData.patientInfo.medicalHistory || "Aucun"}

MOTIF DE CONSULTATION
${"=".repeat(20)}
${reportData.consultation.chiefComplaint || "Non spécifié"}

SYMPTÔMES
${"=".repeat(10)}
${
  Array.isArray(reportData.consultation.symptoms)
    ? reportData.consultation.symptoms.join(", ")
    : reportData.consultation.symptoms || "Non spécifiés"
}

SIGNES VITAUX
${"=".repeat(12)}
${
  reportData.consultation.vitalSigns
    ? Object.entries(reportData.consultation.vitalSigns)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n")
    : "Non renseignés"
}

DIAGNOSTIC
${"=".repeat(10)}
${
  reportData.diagnosis?.primary
    ? `
Diagnostic principal: ${reportData.diagnosis.primary.condition}
Code ICD-10: ${reportData.diagnosis.primary.icd10}
Confiance: ${reportData.diagnosis.primary.confidence}%
Justification: ${reportData.diagnosis.primary.rationale}
`
    : "Diagnostic en cours d'évaluation"
}

EXAMENS PRESCRITS
${"=".repeat(16)}
${
  reportData.examinations.length > 0
    ? reportData.examinations.map((exam: any) => `- ${exam.name}: ${exam.indication}`).join("\n")
    : "Aucun examen prescrit"
}

PRESCRIPTIONS
${"=".repeat(12)}
${
  reportData.prescriptions.length > 0
    ? reportData.prescriptions
        .map((med: any) => `- ${med.name}: ${med.dosage}, ${med.frequency}, ${med.duration}`)
        .join("\n")
    : "Aucune prescription"
}

SUIVI
${"=".repeat(5)}
${reportData.followUp}

Rapport généré le ${new Date().toLocaleString("fr-FR")}
    `.trim()
  }

  if (!reportData) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Génération du rapport en cours...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Rapport de Consultation
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimer
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Rapport */}
      <Card className="print:shadow-none">
        <CardContent className="p-8 space-y-8">
          {/* En-tête */}
          <div className="text-center border-b pb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{reportData.header.title}</h1>
            <div className="flex justify-between text-sm text-gray-600">
              <span>
                Date: {reportData.header.date} à {reportData.header.time}
              </span>
              <span>Médecin: {reportData.header.doctorName}</span>
            </div>
          </div>

          {/* Informations Patient */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Informations Patient
            </h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Nom:</strong> {reportData.header.patientName}
                </div>
                <div>
                  <strong>Âge:</strong> {reportData.patientInfo.age} ans
                </div>
                <div>
                  <strong>Sexe:</strong> {reportData.patientInfo.gender}
                </div>
                <div>
                  <strong>Poids:</strong> {reportData.patientInfo.weight || "Non renseigné"} kg
                </div>
                <div>
                  <strong>Taille:</strong> {reportData.patientInfo.height || "Non renseigné"} cm
                </div>
                <div>
                  <strong>Allergies:</strong> {reportData.patientInfo.allergies || "Aucune connue"}
                </div>
              </div>
              {reportData.patientInfo.medicalHistory && (
                <div className="mt-3">
                  <strong>Antécédents médicaux:</strong>
                  <p className="mt-1 text-gray-700">{reportData.patientInfo.medicalHistory}</p>
                </div>
              )}
            </div>
          </div>

          {/* Consultation */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-green-600" />
              Examen Clinique
            </h2>
            <div className="space-y-4">
              <div>
                <strong>Motif de consultation:</strong>
                <p className="mt-1 text-gray-700">{reportData.consultation.chiefComplaint}</p>
              </div>
              <div>
                <strong>Symptômes:</strong>
                <p className="mt-1 text-gray-700">
                  {Array.isArray(reportData.consultation.symptoms)
                    ? reportData.consultation.symptoms.join(", ")
                    : reportData.consultation.symptoms || "Non spécifiés"}
                </p>
              </div>
              {reportData.consultation.vitalSigns && (
                <div>
                  <strong>Signes vitaux:</strong>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-sm">
                    {Object.entries(reportData.consultation.vitalSigns).map(([key, value]) => (
                      <div key={key}>
                        {key}: {value as string}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Diagnostic */}
          {reportData.diagnosis?.primary && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Diagnostic
              </h2>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-blue-900">{reportData.diagnosis.primary.condition}</h3>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800">
                    Confiance: {reportData.diagnosis.primary.confidence}%
                  </Badge>
                </div>
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Code ICD-10:</strong> {reportData.diagnosis.primary.icd10}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Justification:</strong> {reportData.diagnosis.primary.rationale}
                </p>
              </div>
            </div>
          )}

          {/* Examens */}
          {reportData.examinations.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TestTube className="h-5 w-5 text-orange-600" />
                Examens Prescrits
              </h2>
              <div className="space-y-2">
                {reportData.examinations.map((exam: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{exam.name}</span>
                      <p className="text-sm text-gray-600">{exam.indication}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        exam.priority === "high"
                          ? "bg-red-100 text-red-800"
                          : exam.priority === "medium"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {exam.priority === "high" ? "Urgent" : exam.priority === "medium" ? "Routine" : "Optionnel"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prescriptions */}
          {reportData.prescriptions.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Pill className="h-5 w-5 text-green-600" />
                Prescriptions Médicamenteuses
              </h2>
              <div className="space-y-3">
                {reportData.prescriptions.map((med: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4 bg-green-50">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-green-900">{med.name}</h4>
                      <Badge variant="outline" className="bg-green-100 text-green-800">
                        {med.category || "Médicament"}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p>
                          <strong>Posologie:</strong> {med.dosage}
                        </p>
                        <p>
                          <strong>Fréquence:</strong> {med.frequency}
                        </p>
                      </div>
                      <div>
                        <p>
                          <strong>Durée:</strong> {med.duration}
                        </p>
                        <p>
                          <strong>Indication:</strong> {med.indication}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suivi */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Plan de Suivi
            </h2>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-700">{reportData.followUp}</p>
            </div>
          </div>

          {/* Signature */}
          <div className="border-t pt-6 text-right">
            <p className="text-sm text-gray-600">
              Rapport généré le {new Date(reportData.generatedAt).toLocaleString("fr-FR")}
            </p>
            <p className="text-sm text-gray-600 mt-2">{reportData.header.doctorName}</p>
          </div>
        </CardContent>
      </Card>

      {/* Actions de navigation */}
      <div className="flex justify-between items-center pt-4">
        <Button variant="outline" onClick={onPrevious} className="px-6 py-3 bg-transparent">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Retour Prescription
        </Button>

        <Alert className="max-w-md">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Rapport de consultation généré avec succès. Vous pouvez l'imprimer ou le télécharger.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
