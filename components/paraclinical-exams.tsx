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
  AlertTriangle,
  Clock,
} from "lucide-react"

interface ParaclinicalExamsProps {
  data?: any
  allData?: any
  onDataChange: (data: any) => void
  onNext: () => void
  onPrevious: () => void
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
  timing?: string
  urgency?: string
}

interface GeneratedPrescription {
  id: string
  type: "biology" | "imaging" | "mixed"
  title: string
  exams: Exam[]
  content: string
}

export default function ParaclinicalExams({
  data = {},
  allData,
  onDataChange,
  onNext,
  onPrevious,
}: ParaclinicalExamsProps) {
  const [selectedExams, setSelectedExams] = useState<Exam[]>([])
  const [customExam, setCustomExam] = useState("")
  const [customExamCode, setCustomExamCode] = useState("")
  const [generatedPrescriptions, setGeneratedPrescriptions] = useState<GeneratedPrescription[]>([])
  const [showPrescriptions, setShowPrescriptions] = useState(false)
  const [pubmedData, setPubmedData] = useState<any>(null)

  // Initialiser les examens basés sur les recommandations IA du diagnostic
  useEffect(() => {
    console.log("🔍 Initialisation examens avec données IA complètes:", allData?.diagnosisData)

    // Récupérer les examens recommandés par l'IA depuis le diagnostic
    const aiRecommendedExams: Exam[] = []

    // Vérifier les différentes sources de recommandations dans la structure correcte
    if (allData?.diagnosisData?.data?.recommendedExams) {
      console.log("📋 Examens recommendedExams trouvés:", allData.diagnosisData.data.recommendedExams)

      allData.diagnosisData.data.recommendedExams.forEach((exam: any, index: number) => {
        aiRecommendedExams.push({
          id: `ai_recommended_${index}`,
          name: exam.name || exam.test || "Examen recommandé par IA",
          code: exam.code || `AI${String(index + 1).padStart(3, "0")}`,
          category: exam.category === "biology" ? "biology" : exam.category === "imaging" ? "imaging" : "ai",
          selected: exam.selected || exam.priority === "high" || exam.urgency === "immediate",
          aiRecommended: true,
          priority: exam.priority || "medium",
          indication: exam.indication || "Recommandé par l'analyse diagnostique experte",
          timing: exam.timing || "24h",
          urgency: exam.urgency || "routine",
        })
      })
    }

    // Vérifier aussi dans investigationPlan.immediate
    if (allData?.diagnosisData?.data?.investigationPlan?.immediate) {
      console.log("📋 Examens immediate trouvés:", allData.diagnosisData.data.investigationPlan.immediate)

      allData.diagnosisData.data.investigationPlan.immediate.forEach((exam: any, index: number) => {
        aiRecommendedExams.push({
          id: `ai_immediate_${index}`,
          name: exam.test || exam.name || "Examen immédiat IA",
          code: exam.code || `IMM${String(index + 1).padStart(3, "0")}`,
          category: exam.category === "biology" ? "biology" : exam.category === "imaging" ? "imaging" : "ai",
          selected: true, // Auto-sélectionner les examens immédiats
          aiRecommended: true,
          priority: "high",
          indication: exam.indication || "Examen immédiat recommandé",
          timing: exam.timing || "STAT",
          urgency: exam.urgency || "immediate",
        })
      })
    }

    // Vérifier aussi dans investigationPlan.shortTerm
    if (allData?.diagnosisData?.data?.investigationPlan?.shortTerm) {
      console.log("📋 Examens shortTerm trouvés:", allData.diagnosisData.data.investigationPlan.shortTerm)

      allData.diagnosisData.data.investigationPlan.shortTerm.forEach((exam: any, index: number) => {
        aiRecommendedExams.push({
          id: `ai_shortterm_${index}`,
          name: exam.test || exam.name || "Examen court terme IA",
          code: exam.code || `ST${String(index + 1).padStart(3, "0")}`,
          category: exam.category === "biology" ? "biology" : exam.category === "imaging" ? "imaging" : "ai",
          selected: false,
          aiRecommended: true,
          priority: "medium",
          indication: exam.indication || "Examen court terme recommandé",
          timing: exam.timing || "24h",
          urgency: exam.urgency || "routine",
        })
      })
    }

    console.log("🤖 Examens IA recommandés:", aiRecommendedExams.length, aiRecommendedExams)

    // Examens biologiques standards COMPLETS
    const biologyExams: Exam[] = [
      {
        id: "bio1",
        name: "Numération Formule Sanguine (NFS)",
        code: "HQZZ002",
        category: "biology",
        selected: false,
        indication: "Recherche d'anémie, infection, troubles hématologiques",
        timing: "24h",
        urgency: "routine",
      },
      {
        id: "bio2",
        name: "CRP (Protéine C-Réactive)",
        code: "HQZZ014",
        category: "biology",
        selected: false,
        indication: "Marqueur inflammatoire principal",
        timing: "24h",
        urgency: "routine",
      },
      {
        id: "bio3",
        name: "Vitesse de Sédimentation (VS)",
        code: "HQZZ015",
        category: "biology",
        selected: false,
        indication: "Marqueur inflammatoire complémentaire",
        timing: "24h",
        urgency: "routine",
      },
      {
        id: "bio4",
        name: "Ionogramme sanguin complet",
        code: "HQZZ004",
        category: "biology",
        selected: false,
        indication: "Équilibre électrolytique (Na, K, Cl, CO2)",
        timing: "24h",
        urgency: "routine",
      },
      {
        id: "bio5",
        name: "Glycémie à jeun",
        code: "HQZZ008",
        category: "biology",
        selected: false,
        indication: "Dépistage diabète et troubles glycémiques",
        timing: "24h",
        urgency: "routine",
      },
      {
        id: "bio6",
        name: "Créatininémie + DFG",
        code: "HQZZ010",
        category: "biology",
        selected: false,
        indication: "Fonction rénale et filtration glomérulaire",
        timing: "24h",
        urgency: "routine",
      },
      {
        id: "bio7",
        name: "Transaminases (ALAT, ASAT)",
        code: "HQZZ012",
        category: "biology",
        selected: false,
        indication: "Fonction hépatique",
        timing: "24h",
        urgency: "routine",
      },
      {
        id: "bio8",
        name: "Bilan lipidique complet",
        code: "HQZZ006",
        category: "biology",
        selected: false,
        indication: "Cholestérol total, HDL, LDL, Triglycérides",
        timing: "24h",
        urgency: "routine",
      },
      {
        id: "bio9",
        name: "TSH (Thyréostimuline)",
        code: "HQZZ016",
        category: "biology",
        selected: false,
        indication: "Fonction thyroïdienne",
        timing: "48h",
        urgency: "routine",
      },
      {
        id: "bio10",
        name: "Hémoglobine glyquée (HbA1c)",
        code: "HQZZ018",
        category: "biology",
        selected: false,
        indication: "Équilibre glycémique sur 3 mois",
        timing: "24h",
        urgency: "routine",
      },
      {
        id: "bio11",
        name: "Ferritinémie",
        code: "HQZZ020",
        category: "biology",
        selected: false,
        indication: "Réserves en fer",
        timing: "48h",
        urgency: "routine",
      },
      {
        id: "bio12",
        name: "Vitamine D (25-OH)",
        code: "HQZZ022",
        category: "biology",
        selected: false,
        indication: "Statut vitaminique D",
        timing: "48h",
        urgency: "routine",
      },
      {
        id: "bio13",
        name: "Troponine I Ultra-Sensible",
        code: "HQZZ024",
        category: "biology",
        selected: false,
        indication: "Marqueur de nécrose myocardique",
        timing: "STAT",
        urgency: "immediate",
      },
      {
        id: "bio14",
        name: "D-Dimères",
        code: "HQZZ026",
        category: "biology",
        selected: false,
        indication: "Dépistage thrombose",
        timing: "STAT",
        urgency: "immediate",
      },
      {
        id: "bio15",
        name: "Procalcitonine (PCT)",
        code: "HQZZ028",
        category: "biology",
        selected: false,
        indication: "Marqueur d'infection bactérienne",
        timing: "24h",
        urgency: "routine",
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
        timing: "24h",
        urgency: "routine",
      },
      {
        id: "img2",
        name: "Échographie abdominale",
        code: "ZCQH001",
        category: "imaging",
        selected: false,
        indication: "Exploration abdominale",
        timing: "48h",
        urgency: "routine",
      },
      {
        id: "img3",
        name: "Scanner thoraco-abdomino-pelvien",
        code: "ZCQH096",
        category: "imaging",
        selected: false,
        indication: "Bilan d'extension",
        timing: "48h",
        urgency: "routine",
      },
      {
        id: "img4",
        name: "IRM cérébrale",
        code: "ZCQH004",
        category: "imaging",
        selected: false,
        indication: "Exploration neurologique",
        timing: "48h",
        urgency: "routine",
      },
      {
        id: "img5",
        name: "Échographie cardiaque",
        code: "ZCQK007",
        category: "imaging",
        selected: false,
        indication: "Évaluation fonction cardiaque",
        timing: "24h",
        urgency: "routine",
      },
    ]

    // Fusionner tous les examens en évitant les doublons
    const allExams = [...aiRecommendedExams, ...biologyExams, ...imagingExams]

    // Éliminer les doublons basés sur le nom
    const uniqueExams = allExams.filter((exam, index, self) => index === self.findIndex((e) => e.name === exam.name))

    console.log(
      "✅ Examens initialisés:",
      uniqueExams.length,
      "examens dont",
      aiRecommendedExams.length,
      "recommandés par IA",
    )
    console.log("📊 Examens auto-sélectionnés:", uniqueExams.filter((e) => e.selected).length)

    setSelectedExams(uniqueExams)

    // Charger les données PubMed si disponibles
    if (allData?.diagnosisData?.data?.externalData?.pubmed) {
      setPubmedData(allData.diagnosisData.data.externalData.pubmed)
    }
  }, [allData?.diagnosisData])

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
        timing: "48h",
        urgency: "routine",
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
    if (biologyExams.length > 0 || aiExams.filter((e) => e.name.toLowerCase().includes("sang")).length > 0) {
      const bioExams = [...biologyExams, ...aiExams.filter((e) => e.name.toLowerCase().includes("sang"))]
      prescriptions.push({
        id: "bio_prescription",
        type: "biology",
        title: "Ordonnance - Examens Biologiques",
        exams: bioExams,
        content: generateBiologyPrescription(bioExams),
      })
    }

    // Générer ordonnance imagerie et examens IA
    if (
      imagingExams.length > 0 ||
      aiExams.filter((e) => !e.name.toLowerCase().includes("sang")).length > 0 ||
      customExams.length > 0
    ) {
      const imgExams = [
        ...imagingExams,
        ...aiExams.filter((e) => !e.name.toLowerCase().includes("sang")),
        ...customExams,
      ]
      prescriptions.push({
        id: "imaging_prescription",
        type: "imaging",
        title: "Ordonnance - Examens Complémentaires",
        exams: imgExams,
        content: generateImagingPrescription(imgExams),
      })
    }

    setGeneratedPrescriptions(prescriptions)
    setShowPrescriptions(true)
  }

  const generateBiologyPrescription = (exams: Exam[]) => {
    const patientName = `${allData?.patientData?.firstName || "Prénom"} ${allData?.patientData?.lastName || "Nom"}`
    const patientAge = allData?.patientData?.age || "XX"
    const today = new Date().toLocaleDateString("fr-FR")

    // Séparer les examens urgents et routiniers
    const urgentExams = exams.filter((e) => e.urgency === "immediate" || e.timing === "STAT")
    const routineExams = exams.filter((e) => e.urgency !== "immediate" && e.timing !== "STAT")

    return `ORDONNANCE MÉDICALE - EXAMENS BIOLOGIQUES

Dr. [Nom du Médecin]
[Adresse du Cabinet]
[Téléphone]

Date: ${today}

PATIENT:
Nom: ${patientName}
Âge: ${patientAge} ans
Né(e) le: ${allData?.patientData?.birthDate || "XX/XX/XXXX"}

DIAGNOSTIC SUSPECTÉ:
${allData?.diagnosisData?.data?.comprehensiveDiagnosis?.primary?.condition || "À préciser"}
Code ICD-10: ${allData?.diagnosisData?.data?.comprehensiveDiagnosis?.primary?.icd10 || ""}

${
  urgentExams.length > 0
    ? `
EXAMENS URGENTS (STAT):
${urgentExams
  .map(
    (exam) => `• ${exam.name}${exam.code ? ` (${exam.code})` : ""}
  Indication: ${exam.indication || "Bilan diagnostique"}
  Timing: ${exam.timing || "STAT"}${exam.aiRecommended ? " [Recommandé par IA]" : ""}`,
  )
  .join("\n\n")}
`
    : ""
}

${
  routineExams.length > 0
    ? `
EXAMENS DE ROUTINE:
${routineExams
  .map(
    (exam) => `• ${exam.name}${exam.code ? ` (${exam.code})` : ""}
  Indication: ${exam.indication || "Bilan diagnostique"}
  Timing: ${exam.timing || "24h"}${exam.aiRecommended ? " [Recommandé par IA]" : ""}`,
  )
  .join("\n\n")}
`
    : ""
}

RENSEIGNEMENTS CLINIQUES:
${allData?.clinicalData?.chiefComplaint || "Bilan de santé"}
Symptômes: ${Array.isArray(allData?.clinicalData?.symptoms) ? allData.clinicalData.symptoms.join(", ") : allData?.clinicalData?.symptoms || ""}

À JEUN: ${exams.some((e) => e.name.toLowerCase().includes("glycémie") || e.name.toLowerCase().includes("lipidique")) ? "OUI (12h)" : "NON"}

URGENT: ${urgentExams.length > 0 ? "OUI" : "NON"}

${
  pubmedData?.articles?.length > 0
    ? `
RÉFÉRENCES SCIENTIFIQUES (PubMed):
${pubmedData.articles
  .slice(0, 2)
  .map((article: any) => `• ${article.title} - ${article.journal} ${article.year}`)
  .join("\n")}
`
    : ""
}

${
  allData?.diagnosisData?.data?.externalData?.apisUsed?.length > 0
    ? `
DONNÉES INTÉGRÉES: ${allData.diagnosisData.data.externalData.apisUsed.join(", ")}
`
    : ""
}

Signature et cachet du médecin`
  }

  const generateImagingPrescription = (exams: Exam[]) => {
    const patientName = `${allData?.patientData?.firstName || "Prénom"} ${allData?.patientData?.lastName || "Nom"}`
    const patientAge = allData?.patientData?.age || "XX"
    const today = new Date().toLocaleDateString("fr-FR")

    // Séparer les examens urgents et routiniers
    const urgentExams = exams.filter((e) => e.urgency === "immediate" || e.timing === "STAT")
    const routineExams = exams.filter((e) => e.urgency !== "immediate" && e.timing !== "STAT")

    return `ORDONNANCE MÉDICALE - EXAMENS COMPLÉMENTAIRES

Dr. [Nom du Médecin]
[Adresse du Cabinet]
[Téléphone]

Date: ${today}

PATIENT:
Nom: ${patientName}
Âge: ${patientAge} ans
Né(e) le: ${allData?.patientData?.birthDate || "XX/XX/XXXX"}

DIAGNOSTIC SUSPECTÉ:
${allData?.diagnosisData?.data?.comprehensiveDiagnosis?.primary?.condition || "À préciser"}
Code ICD-10: ${allData?.diagnosisData?.data?.comprehensiveDiagnosis?.primary?.icd10 || ""}

${
  urgentExams.length > 0
    ? `
EXAMENS URGENTS:
${urgentExams
  .map(
    (exam) => `• ${exam.name}${exam.code ? ` (${exam.code})` : ""}
  Indication: ${exam.indication || "Exploration diagnostique"}
  Timing: ${exam.timing || "STAT"}${exam.aiRecommended ? " [Recommandé par IA]" : ""}`,
  )
  .join("\n\n")}
`
    : ""
}

${
  routineExams.length > 0
    ? `
EXAMENS PROGRAMMÉS:
${routineExams
  .map(
    (exam) => `• ${exam.name}${exam.code ? ` (${exam.code})` : ""}
  Indication: ${exam.indication || "Exploration diagnostique"}
  Timing: ${exam.timing || "48h"}${exam.aiRecommended ? " [Recommandé par IA]" : ""}`,
  )
  .join("\n\n")}
`
    : ""
}

RENSEIGNEMENTS CLINIQUES:
${allData?.clinicalData?.chiefComplaint || "Exploration diagnostique"}
Symptômes: ${Array.isArray(allData?.clinicalData?.symptoms) ? allData.clinicalData.symptoms.join(", ") : allData?.clinicalData?.symptoms || ""}

URGENT: ${urgentExams.length > 0 ? "OUI" : "NON"}

${
  pubmedData?.articles?.length > 0
    ? `
RÉFÉRENCES SCIENTIFIQUES (PubMed):
${pubmedData.articles
  .slice(0, 2)
  .map((article: any) => `• ${article.title} - ${article.journal} ${article.year}`)
  .join("\n")}
`
    : ""
}

${
  allData?.diagnosisData?.data?.externalData?.apisUsed?.length > 0
    ? `
DONNÉES INTÉGRÉES: ${allData.diagnosisData.data.externalData.apisUsed.join(", ")}
`
    : ""
}

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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-yellow-100 text-yellow-800"
      case "low":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case "immediate":
        return <AlertTriangle className="h-3 w-3 text-red-600" />
      case "urgent":
        return <Clock className="h-3 w-3 text-orange-600" />
      default:
        return <Clock className="h-3 w-3 text-gray-600" />
    }
  }

  const handleSubmit = () => {
    const examData = {
      selectedExams: selectedExams.filter((e) => e.selected),
      prescriptions: generatedPrescriptions,
      pubmedEvidence: pubmedData,
      aiRecommendationsUsed: selectedExams.filter((e) => e.selected && e.aiRecommended).length,
      totalExamsSelected: selectedExams.filter((e) => e.selected).length,
      completedAt: new Date().toISOString(),
    }
    onDataChange(examData)
    onNext()
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

        {/* Evidence PubMed */}
        {pubmedData?.articles?.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Références Scientifiques PubMed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pubmedData.articles.slice(0, 3).map((article: any, index: number) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                    <h4 className="font-semibold text-sm">{article.title}</h4>
                    <p className="text-xs text-gray-600">
                      {article.journal} - {article.year}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{article.abstract?.substring(0, 200)}...</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Prescriptions générées */}
        <div className="grid gap-6">
          {generatedPrescriptions.map((prescription) => (
            <Card key={prescription.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {prescription.type === "biology" ? (
                      <TestTube className="h-5 w-5 text-blue-600" />
                    ) : (
                      <Camera className="h-5 w-5 text-green-600" />
                    )}
                    {prescription.title}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => downloadPrescription(prescription)}>
                      <Download className="h-4 w-4 mr-1" />
                      Télécharger
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => printPrescription(prescription)}>
                      <Printer className="h-4 w-4 mr-1" />
                      Imprimer
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Badge variant="secondary" className="mr-2">
                    {prescription.exams.length} examens
                  </Badge>
                  <Badge variant="secondary">
                    {prescription.exams.filter((e) => e.aiRecommended).length} recommandés par IA
                  </Badge>
                </div>
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg border max-h-96 overflow-y-auto">
                  {prescription.content}
                </pre>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-between">
          <Button onClick={onPrevious} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Précédent
          </Button>
          <Button onClick={handleSubmit}>
            Continuer vers Médicaments
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  const selectedCount = selectedExams.filter((e) => e.selected).length
  const aiRecommendedCount = selectedExams.filter((e) => e.aiRecommended).length
  const aiSelectedCount = selectedExams.filter((e) => e.selected && e.aiRecommended).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Examens Paracliniques</h2>
          <p className="text-gray-600">Sélectionnez les examens biologiques et d'imagerie nécessaires au diagnostic</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">
            {selectedCount} examens sélectionnés
            {aiRecommendedCount > 0 && (
              <div className="text-purple-600">
                {aiSelectedCount}/{aiRecommendedCount} recommandations IA utilisées
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Diagnostic context */}
      {allData?.diagnosisData?.data?.comprehensiveDiagnosis?.primary && (
        <Alert>
          <Brain className="h-4 w-4" />
          <AlertDescription>
            <strong>Diagnostic suspecté:</strong> {allData.diagnosisData.data.comprehensiveDiagnosis.primary.condition}
            <br />
            <strong>Confiance:</strong> {allData.diagnosisData.data.comprehensiveDiagnosis.primary.confidence}%
          </AlertDescription>
        </Alert>
      )}

      {/* Examens recommandés par IA */}
      {selectedExams.filter((e) => e.aiRecommended).length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Brain className="h-5 w-5" />
              Examens Recommandés par l'IA Diagnostique ({selectedExams.filter((e) => e.aiRecommended).length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {selectedExams
                .filter((e) => e.aiRecommended)
                .map((exam) => (
                  <div key={exam.id} className="flex items-start space-x-3 p-3 bg-white rounded-lg border">
                    <Checkbox
                      id={exam.id}
                      checked={exam.selected}
                      onCheckedChange={() => toggleExam(exam.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getCategoryIcon(exam.category)}
                        <Label htmlFor={exam.id} className="font-medium cursor-pointer">
                          {exam.name}
                        </Label>
                        {exam.code && <Badge variant="outline">{exam.code}</Badge>}
                        {exam.priority && (
                          <Badge className={getPriorityColor(exam.priority)} variant="secondary">
                            {exam.priority}
                          </Badge>
                        )}
                        {exam.urgency && (
                          <div className="flex items-center gap-1">
                            {getUrgencyIcon(exam.urgency)}
                            <span className="text-xs">{exam.urgency}</span>
                          </div>
                        )}
                      </div>
                      {exam.indication && <p className="text-sm text-gray-600 mb-1">{exam.indication}</p>}
                      {exam.timing && (
                        <p className="text-xs text-gray-500">
                          <Clock className="h-3 w-3 inline mr-1" />
                          Délai: {exam.timing}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

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
              .filter((e) => e.category === "biology" && !e.aiRecommended)
              .map((exam) => (
                <div key={exam.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                  <Checkbox
                    id={exam.id}
                    checked={exam.selected}
                    onCheckedChange={() => toggleExam(exam.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Label htmlFor={exam.id} className="font-medium cursor-pointer">
                        {exam.name}
                      </Label>
                      {exam.code && <Badge variant="outline">{exam.code}</Badge>}
                    </div>
                    {exam.indication && <p className="text-sm text-gray-600">{exam.indication}</p>}
                  </div>
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
              .filter((e) => e.category === "imaging" && !e.aiRecommended)
              .map((exam) => (
                <div key={exam.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                  <Checkbox
                    id={exam.id}
                    checked={exam.selected}
                    onCheckedChange={() => toggleExam(exam.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Label htmlFor={exam.id} className="font-medium cursor-pointer">
                        {exam.name}
                      </Label>
                      {exam.code && <Badge variant="outline">{exam.code}</Badge>}
                    </div>
                    {exam.indication && <p className="text-sm text-gray-600">{exam.indication}</p>}
                  </div>
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
          <div className="flex gap-2">
            <Input
              placeholder="Nom de l'examen"
              value={customExam}
              onChange={(e) => setCustomExam(e.target.value)}
              className="flex-1"
            />
            <Input
              placeholder="Code (optionnel)"
              value={customExamCode}
              onChange={(e) => setCustomExamCode(e.target.value)}
              className="w-32"
            />
            <Button onClick={addCustomExam} disabled={!customExam.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Examens personnalisés ajoutés */}
          {selectedExams.filter((e) => e.category === "custom").length > 0 && (
            <div className="mt-4 space-y-2">
              <Separator />
              <h4 className="font-medium">Examens Personnalisés</h4>
              {selectedExams
                .filter((e) => e.category === "custom")
                .map((exam) => (
                  <div key={exam.id} className="flex items-center space-x-3 p-2 bg-gray-50 rounded">
                    <Checkbox id={exam.id} checked={exam.selected} onCheckedChange={() => toggleExam(exam.id)} />
                    <Label htmlFor={exam.id} className="flex-1 cursor-pointer">
                      {exam.name} {exam.code && `(${exam.code})`}
                    </Label>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button onClick={onPrevious} variant="outline">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Précédent
        </Button>
        <div className="flex gap-2">
          <Button onClick={generatePrescriptions} disabled={selectedCount === 0} variant="outline">
            <FileText className="h-4 w-4 mr-2" />
            Générer Ordonnances ({selectedCount})
          </Button>
          <Button onClick={handleSubmit} disabled={selectedCount === 0}>
            Continuer vers Médicaments
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
