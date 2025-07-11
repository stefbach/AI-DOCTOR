"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  Plus,
  FileText,
  Download,
  Printer,
  Brain,
  TestTube,
  Camera,
  Stethoscope,
  ArrowLeft,
  ArrowRight,
} from "lucide-react"

interface ParaclinicalExamsProps {
  patientData: any
  clinicalData: any
  questionsData: any
  diagnosisData: any
  onNext: (data: any) => void
  onBack: () => void
}

interface Exam {
  id: string
  name: string
  code?: string
  category: "biology" | "imaging" | "ai" | "custom"
  selected: boolean
  aiRecommended?: boolean
  priority?: "high" | "medium" | "low"
  indication?: string
}

interface GeneratedPrescription {
  id: string
  type: "biology" | "imaging" | "mixed"
  title: string
  exams: Exam[]
  content: string
}

export default function ParaclinicalExams({
  patientData,
  clinicalData,
  questionsData,
  diagnosisData,
  onNext,
  onBack,
}: ParaclinicalExamsProps) {
  const [selectedExams, setSelectedExams] = useState<Exam[]>([])
  const [customExam, setCustomExam] = useState("")
  const [customExamCode, setCustomExamCode] = useState("")
  const [generatedPrescriptions, setGeneratedPrescriptions] = useState<GeneratedPrescription[]>([])
  const [showPrescriptions, setShowPrescriptions] = useState(false)

  // Initialiser les examens basés sur les recommandations IA du diagnostic
  useEffect(() => {
    if (diagnosisData?.recommendedExams) {
      const aiExams: Exam[] = diagnosisData.recommendedExams.map((exam: any, index: number) => ({
        id: `ai_${index}`,
        name: exam.name,
        code: exam.code,
        category: "ai" as const,
        selected: exam.category === "urgent", // Auto-sélectionner les examens urgents
        aiRecommended: true,
        priority: exam.category === "urgent" ? ("high" as const) : ("medium" as const),
        indication: exam.indication,
      }))

      // Examens biologiques standards
      const biologyExams: Exam[] = [
        {
          id: "bio1",
          name: "Numération Formule Sanguine (NFS)",
          code: "HQZZ002",
          category: "biology",
          selected: false,
          indication: "Recherche d'anémie, infection",
        },
        {
          id: "bio2",
          name: "Ionogramme sanguin",
          code: "HQZZ004",
          category: "biology",
          selected: false,
          indication: "Équilibre électrolytique",
        },
        {
          id: "bio3",
          name: "Bilan lipidique",
          code: "HQZZ006",
          category: "biology",
          selected: false,
          indication: "Facteurs de risque cardiovasculaire",
        },
        {
          id: "bio4",
          name: "Glycémie à jeun",
          code: "HQZZ008",
          category: "biology",
          selected: false,
          indication: "Dépistage diabète",
        },
        {
          id: "bio5",
          name: "Créatininémie",
          code: "HQZZ010",
          category: "biology",
          selected: false,
          indication: "Fonction rénale",
        },
        {
          id: "bio6",
          name: "Transaminases (ALAT, ASAT)",
          code: "HQZZ012",
          category: "biology",
          selected: false,
          indication: "Fonction hépatique",
        },
        {
          id: "bio7",
          name: "CRP (Protéine C-Réactive)",
          code: "HQZZ014",
          category: "biology",
          selected: false,
          indication: "Marqueur inflammatoire",
        },
        {
          id: "bio8",
          name: "TSH (Thyréostimuline)",
          code: "HQZZ016",
          category: "biology",
          selected: false,
          indication: "Fonction thyroïdienne",
        },
      ]

      // Examens d'imagerie standards
      const imagingExams: Exam[] = [
        {
          id: "img1",
          name: "Radiographie thoracique",
          code: "ZCQK002",
          category: "imaging",
          selected: false,
          indication: "Exploration thoracique",
        },
        {
          id: "img2",
          name: "Échographie abdominale",
          code: "ZCQH001",
          category: "imaging",
          selected: false,
          indication: "Exploration abdominale",
        },
        {
          id: "img3",
          name: "Scanner thoraco-abdomino-pelvien",
          code: "ZCQH096",
          category: "imaging",
          selected: false,
          indication: "Bilan d'extension",
        },
        {
          id: "img4",
          name: "IRM cérébrale",
          code: "ZCQH004",
          category: "imaging",
          selected: false,
          indication: "Exploration neurologique",
        },
        {
          id: "img5",
          name: "Échographie cardiaque",
          code: "ZCQK007",
          category: "imaging",
          selected: false,
          indication: "Fonction cardiaque",
        },
        {
          id: "img6",
          name: "Mammographie bilatérale",
          code: "ZCQH020",
          category: "imaging",
          selected: false,
          indication: "Dépistage mammaire",
        },
      ]

      setSelectedExams([...aiExams, ...biologyExams, ...imagingExams])
    }
  }, [diagnosisData])

  const toggleExam = (examId: string) => {
    setSelectedExams((prev) => prev.map((exam) => (exam.id === examId ? { ...exam, selected: !exam.selected } : exam)))
  }

  const addCustomExam = () => {
    if (customExam.trim()) {
      const newExam: Exam = {
        id: `custom_${Date.now()}`,
        name: customExam.trim(),
        code: customExamCode.trim() || undefined,
        category: "custom",
        selected: true,
        indication: "Examen personnalisé",
      }
      setSelectedExams((prev) => [...prev, newExam])
      setCustomExam("")
      setCustomExamCode("")
    }
  }

  const generatePrescriptions = () => {
    const selected = selectedExams.filter((exam) => exam.selected)
    if (selected.length === 0) return

    const prescriptions: GeneratedPrescription[] = []

    // Grouper les examens par catégorie
    const biologyExams = selected.filter((exam) => exam.category === "biology")
    const imagingExams = selected.filter((exam) => exam.category === "imaging")
    const aiExams = selected.filter((exam) => exam.category === "ai")
    const customExams = selected.filter((exam) => exam.category === "custom")

    // Générer ordonnance biologique
    if (biologyExams.length > 0) {
      prescriptions.push({
        id: "bio_prescription",
        type: "biology",
        title: "Ordonnance - Examens Biologiques",
        exams: biologyExams,
        content: generateBiologyPrescription(biologyExams),
      })
    }

    // Générer ordonnance imagerie et examens IA
    if (imagingExams.length > 0 || aiExams.length > 0 || customExams.length > 0) {
      const allImagingExams = [...imagingExams, ...aiExams, ...customExams]
      prescriptions.push({
        id: "imaging_prescription",
        type: "imaging",
        title: "Ordonnance - Examens Complémentaires",
        exams: allImagingExams,
        content: generateImagingPrescription(allImagingExams),
      })
    }

    setGeneratedPrescriptions(prescriptions)
    setShowPrescriptions(true)
  }

  const generateBiologyPrescription = (exams: Exam[]) => {
    const patientName = `${patientData?.firstName || "Prénom"} ${patientData?.lastName || "Nom"}`
    const patientAge = patientData?.age || "XX"
    const today = new Date().toLocaleDateString("fr-FR")

    return `ORDONNANCE MÉDICALE - EXAMENS BIOLOGIQUES

Dr. [Nom du Médecin]
[Adresse du Cabinet]
[Téléphone]

Date: ${today}

PATIENT:
Nom: ${patientName}
Âge: ${patientAge} ans
Né(e) le: ${patientData?.birthDate || "XX/XX/XXXX"}

DIAGNOSTIC SUSPECTÉ:
${diagnosisData?.primaryDiagnosis?.condition || "À préciser"}
Code ICD-10: ${diagnosisData?.primaryDiagnosis?.icd10 || ""}

EXAMENS PRESCRITS:

${exams
  .map(
    (exam) => `• ${exam.name}${exam.code ? ` (${exam.code})` : ""}
  Indication: ${exam.indication || "Bilan diagnostique"}`,
  )
  .join("\n\n")}

RENSEIGNEMENTS CLINIQUES:
${clinicalData?.chiefComplaint || "Bilan de santé"}
${clinicalData?.historyOfPresentIllness || ""}

À JEUN: ${exams.some((e) => e.name.toLowerCase().includes("glycémie") || e.name.toLowerCase().includes("lipidique")) ? "OUI (12h)" : "NON"}

URGENT: ${exams.some((e) => e.priority === "high") ? "OUI" : "NON"}

Signature et cachet du médecin`
  }

  const generateImagingPrescription = (exams: Exam[]) => {
    const patientName = `${patientData?.firstName || "Prénom"} ${patientData?.lastName || "Nom"}`
    const patientAge = patientData?.age || "XX"
    const today = new Date().toLocaleDateString("fr-FR")

    return `ORDONNANCE MÉDICALE - EXAMENS COMPLÉMENTAIRES

Dr. [Nom du Médecin]
[Adresse du Cabinet]
[Téléphone]

Date: ${today}

PATIENT:
Nom: ${patientName}
Âge: ${patientAge} ans
Né(e) le: ${patientData?.birthDate || "XX/XX/XXXX"}

DIAGNOSTIC SUSPECTÉ:
${diagnosisData?.primaryDiagnosis?.condition || "À préciser"}
Code ICD-10: ${diagnosisData?.primaryDiagnosis?.icd10 || ""}

EXAMENS PRESCRITS:

${exams
  .map(
    (exam) => `• ${exam.name}${exam.code ? ` (${exam.code})` : ""}
  Indication: ${exam.indication || "Exploration diagnostique"}${exam.aiRecommended ? " [Recommandé par IA]" : ""}`,
  )
  .join("\n\n")}

RENSEIGNEMENTS CLINIQUES:
${clinicalData?.chiefComplaint || "Exploration diagnostique"}
${clinicalData?.historyOfPresentIllness || ""}
${clinicalData?.physicalExamination || ""}

URGENT: ${exams.some((e) => e.priority === "high") ? "OUI" : "NON"}

Signature et cachet du médecin`
  }

  const downloadPrescription = (prescription: GeneratedPrescription) => {
    const element = document.createElement("a")
    const file = new Blob([prescription.content], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `${prescription.title.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const printPrescription = (prescription: GeneratedPrescription) => {
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${prescription.title}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
              pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
            </style>
          </head>
          <body>
            <pre>${prescription.content}</pre>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "biology":
        return <TestTube className="h-4 w-4" />
      case "imaging":
        return <Camera className="h-4 w-4" />
      case "ai":
        return <Brain className="h-4 w-4" />
      default:
        return <Stethoscope className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "biology":
        return "bg-blue-100 text-blue-800"
      case "imaging":
        return "bg-green-100 text-green-800"
      case "ai":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (showPrescriptions) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Ordonnances Générées</h2>
          <Button onClick={() => setShowPrescriptions(false)} variant="outline">
            Retour aux Examens
          </Button>
        </div>

        {generatedPrescriptions.map((prescription) => (
          <Card key={prescription.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {prescription.title}
                </CardTitle>
                <div className="flex gap-2">
                  <Button onClick={() => downloadPrescription(prescription)} size="sm" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger
                  </Button>
                  <Button onClick={() => printPrescription(prescription)} size="sm" variant="outline">
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimer
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg">{prescription.content}</pre>
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-between">
          <Button onClick={onBack} variant="outline">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Retour
          </Button>
          <Button
            onClick={() =>
              onNext({ prescriptions: generatedPrescriptions, selectedExams: selectedExams.filter((e) => e.selected) })
            }
          >
            Continuer vers les Prescriptions
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Examens Paracliniques</h2>
        <p className="text-gray-600">
          Examens recommandés pour {patientData?.firstName} {patientData?.lastName} - Diagnostic:{" "}
          {diagnosisData?.primaryDiagnosis?.condition}
        </p>
      </div>

      {/* Examens recommandés par l'IA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Examens Recommandés par l'IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <Brain className="h-4 w-4" />
            <AlertDescription>
              Ces examens ont été automatiquement sélectionnés par l'IA basés sur le diagnostic:
              <strong> {diagnosisData?.primaryDiagnosis?.condition}</strong>
            </AlertDescription>
          </Alert>
          <div className="grid gap-3">
            {selectedExams
              .filter((exam) => exam.aiRecommended)
              .map((exam) => (
                <div key={exam.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox id={exam.id} checked={exam.selected} onCheckedChange={() => toggleExam(exam.id)} />
                  <div className="flex-1">
                    <Label htmlFor={exam.id} className="font-medium cursor-pointer">
                      {exam.name}
                    </Label>
                    {exam.code && <p className="text-sm text-gray-500">Code: {exam.code}</p>}
                    {exam.indication && <p className="text-sm text-gray-600">{exam.indication}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                      <Brain className="h-3 w-3 mr-1" />
                      IA
                    </Badge>
                    {exam.priority && (
                      <Badge variant={exam.priority === "high" ? "destructive" : "secondary"}>
                        {exam.priority === "high" ? "Urgent" : "Recommandé"}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Examens biologiques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-blue-600" />
            Examens Biologiques
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {selectedExams
              .filter((exam) => exam.category === "biology")
              .map((exam) => (
                <div key={exam.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox id={exam.id} checked={exam.selected} onCheckedChange={() => toggleExam(exam.id)} />
                  <div className="flex-1">
                    <Label htmlFor={exam.id} className="font-medium cursor-pointer">
                      {exam.name}
                    </Label>
                    {exam.code && <p className="text-sm text-gray-500">Code: {exam.code}</p>}
                    {exam.indication && <p className="text-sm text-gray-600">{exam.indication}</p>}
                  </div>
                  <Badge className={getCategoryColor(exam.category)}>
                    {getCategoryIcon(exam.category)}
                    <span className="ml-1">Biologie</span>
                  </Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Examens d'imagerie */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-green-600" />
            Examens d'Imagerie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {selectedExams
              .filter((exam) => exam.category === "imaging")
              .map((exam) => (
                <div key={exam.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Checkbox id={exam.id} checked={exam.selected} onCheckedChange={() => toggleExam(exam.id)} />
                  <div className="flex-1">
                    <Label htmlFor={exam.id} className="font-medium cursor-pointer">
                      {exam.name}
                    </Label>
                    {exam.code && <p className="text-sm text-gray-500">Code: {exam.code}</p>}
                    {exam.indication && <p className="text-sm text-gray-600">{exam.indication}</p>}
                  </div>
                  <Badge className={getCategoryColor(exam.category)}>
                    {getCategoryIcon(exam.category)}
                    <span className="ml-1">Imagerie</span>
                  </Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Examens personnalisés */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Ajouter un Examen Personnalisé
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="customExam">Nom de l'examen</Label>
                <Input
                  id="customExam"
                  value={customExam}
                  onChange={(e) => setCustomExam(e.target.value)}
                  placeholder="Ex: Dosage vitamine D"
                />
              </div>
              <div>
                <Label htmlFor="customExamCode">Code (optionnel)</Label>
                <Input
                  id="customExamCode"
                  value={customExamCode}
                  onChange={(e) => setCustomExamCode(e.target.value)}
                  placeholder="Ex: HQZZ020"
                />
              </div>
            </div>
            <Button onClick={addCustomExam} disabled={!customExam.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter l'Examen
            </Button>
          </div>

          {/* Afficher les examens personnalisés ajoutés */}
          {selectedExams.filter((exam) => exam.category === "custom").length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">Examens Personnalisés Ajoutés</h4>
              <div className="space-y-2">
                {selectedExams
                  .filter((exam) => exam.category === "custom")
                  .map((exam) => (
                    <div key={exam.id} className="flex items-center space-x-3 p-3 border rounded-lg bg-gray-50">
                      <Checkbox id={exam.id} checked={exam.selected} onCheckedChange={() => toggleExam(exam.id)} />
                      <div className="flex-1">
                        <Label htmlFor={exam.id} className="font-medium cursor-pointer">
                          {exam.name}
                        </Label>
                        {exam.code && <p className="text-sm text-gray-500">Code: {exam.code}</p>}
                      </div>
                      <Badge className={getCategoryColor(exam.category)}>
                        {getCategoryIcon(exam.category)}
                        <span className="ml-1">Personnalisé</span>
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Résumé des examens sélectionnés */}
      {selectedExams.filter((exam) => exam.selected).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Examens Sélectionnés ({selectedExams.filter((exam) => exam.selected).length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {selectedExams
                .filter((exam) => exam.selected)
                .map((exam) => (
                  <div key={exam.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="font-medium">{exam.name}</span>
                    <div className="flex items-center gap-2">
                      {exam.code && <span className="text-sm text-gray-500">{exam.code}</span>}
                      <Badge className={getCategoryColor(exam.category)}>{getCategoryIcon(exam.category)}</Badge>
                      {exam.aiRecommended && (
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                          IA
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="flex justify-between">
        <Button onClick={onBack} variant="outline">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Retour Diagnostic
        </Button>
        <div className="flex gap-4">
          <Button
            onClick={generatePrescriptions}
            disabled={selectedExams.filter((exam) => exam.selected).length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <FileText className="h-4 w-4 mr-2" />
            Générer Ordonnances ({selectedExams.filter((exam) => exam.selected).length})
          </Button>
        </div>
      </div>
    </div>
  )
}
