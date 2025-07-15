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
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  Pill,
  Download,
  Printer,
  Brain,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Shield,
  Clock,
  CheckCircle,
} from "lucide-react"

interface MedicationPrescriptionProps {
  data?: any
  allData?: any
  onDataChange: (data: any) => void
  onNext: () => void
  onPrevious: () => void
}

interface Medication {
  id: string
  name: string
  internationalName?: string
  dosage: string
  frequency: string
  duration: string
  indication: string
  priority: "high" | "medium" | "low"
  selected: boolean
  aiRecommended?: boolean
  contraindications?: {
    absolute: string[]
    relative: string[]
  }
  monitoring?: string
  evidenceLevel?: string
  fdaApproved?: boolean
}

interface GeneratedPrescription {
  id: string
  title: string
  medications: Medication[]
  content: string
}

export default function MedicationPrescription({
  data = {},
  allData,
  onDataChange,
  onNext,
  onPrevious,
}: MedicationPrescriptionProps) {
  const [selectedMedications, setSelectedMedications] = useState<Medication[]>([])
  const [customMedication, setCustomMedication] = useState({
    name: "",
    dosage: "",
    frequency: "",
    duration: "",
    indication: "",
  })
  const [generatedPrescription, setGeneratedPrescription] = useState<GeneratedPrescription | null>(null)
  const [showPrescription, setShowPrescription] = useState(false)
  const [fdaData, setFdaData] = useState<any>(null)
  const [rxnormData, setRxnormData] = useState<any>(null)

  // Initialiser les médicaments basés sur les recommandations IA du diagnostic
  useEffect(() => {
    console.log("💊 Initialisation médicaments avec données IA complètes:", allData?.diagnosisData)

    // Récupérer les médicaments recommandés par l'IA depuis le diagnostic
    const aiRecommendedMedications: Medication[] = []

    // Vérifier dans expertTherapeutics.evidenceBasedMedications
    if (allData?.diagnosisData?.data?.expertTherapeutics?.evidenceBasedMedications) {
      console.log(
        "💊 Médicaments evidenceBasedMedications trouvés:",
        allData.diagnosisData.data.expertTherapeutics.evidenceBasedMedications,
      )

      allData.diagnosisData.data.expertTherapeutics.evidenceBasedMedications.forEach((med: any, index: number) => {
        aiRecommendedMedications.push({
          id: `ai_med_${index}`,
          name: med.name || "Médicament recommandé par IA",
          internationalName: med.internationalName || med.generic_name,
          dosage: med.dosage || "À définir",
          frequency: med.frequency || "Selon prescription",
          duration: med.duration || "Selon indication",
          indication: med.indication || "Recommandé par l'analyse diagnostique experte",
          priority: med.priority === "high" ? "high" : med.priority === "low" ? "low" : "medium",
          selected: med.selected || med.priority === "high",
          aiRecommended: true,
          contraindications: med.contraindications || { absolute: [], relative: [] },
          monitoring: med.monitoring || "Surveillance clinique",
          evidenceLevel: med.evidenceLevel || "B",
          fdaApproved: med.fdaApproved || false,
        })
      })
    }

    console.log("🤖 Médicaments IA recommandés:", aiRecommendedMedications.length, aiRecommendedMedications)

    // Médicaments standards par catégorie thérapeutique
    const standardMedications: Medication[] = [
      // Antalgiques
      {
        id: "med1",
        name: "Paracétamol",
        internationalName: "Paracetamol",
        dosage: "500mg",
        frequency: "3 fois par jour",
        duration: "5 jours",
        indication: "Douleur et fièvre",
        priority: "medium",
        selected: false,
        contraindications: {
          absolute: ["Insuffisance hépatique sévère"],
          relative: ["Alcoolisme chronique"],
        },
        monitoring: "Surveillance hépatique si traitement prolongé",
        evidenceLevel: "A",
        fdaApproved: true,
      },
      {
        id: "med2",
        name: "Ibuprofène",
        internationalName: "Ibuprofen",
        dosage: "400mg",
        frequency: "3 fois par jour",
        duration: "5 jours",
        indication: "Douleur et inflammation",
        priority: "medium",
        selected: false,
        contraindications: {
          absolute: ["Ulcère gastro-duodénal actif", "Insuffisance rénale sévère"],
          relative: ["Hypertension", "Âge > 65 ans"],
        },
        monitoring: "Surveillance rénale et cardiovasculaire",
        evidenceLevel: "A",
        fdaApproved: true,
      },
      {
        id: "med3",
        name: "Tramadol",
        internationalName: "Tramadol",
        dosage: "50mg",
        frequency: "3 fois par jour",
        duration: "3 jours",
        indication: "Douleur modérée à sévère",
        priority: "low",
        selected: false,
        contraindications: {
          absolute: ["Épilepsie non contrôlée", "Prise d'IMAO"],
          relative: ["Insuffisance respiratoire", "Dépendance"],
        },
        monitoring: "Surveillance neurologique et respiratoire",
        evidenceLevel: "B",
        fdaApproved: true,
      },

      // Antibiotiques
      {
        id: "med4",
        name: "Amoxicilline",
        internationalName: "Amoxicillin",
        dosage: "1g",
        frequency: "3 fois par jour",
        duration: "7 jours",
        indication: "Infection bactérienne",
        priority: "high",
        selected: false,
        contraindications: {
          absolute: ["Allergie pénicillines"],
          relative: ["Antécédents allergiques"],
        },
        monitoring: "Surveillance clinique et biologique",
        evidenceLevel: "A",
        fdaApproved: true,
      },
      {
        id: "med5",
        name: "Azithromycine",
        internationalName: "Azithromycin",
        dosage: "500mg",
        frequency: "1 fois par jour",
        duration: "3 jours",
        indication: "Infection respiratoire",
        priority: "medium",
        selected: false,
        contraindications: {
          absolute: ["Allergie macrolides"],
          relative: ["Troubles du rythme cardiaque"],
        },
        monitoring: "Surveillance cardiaque",
        evidenceLevel: "A",
        fdaApproved: true,
      },

      // Cardiovasculaire
      {
        id: "med6",
        name: "Amlodipine",
        internationalName: "Amlodipine",
        dosage: "5mg",
        frequency: "1 fois par jour",
        duration: "Traitement au long cours",
        indication: "Hypertension artérielle",
        priority: "high",
        selected: false,
        contraindications: {
          absolute: ["Choc cardiogénique"],
          relative: ["Insuffisance cardiaque sévère"],
        },
        monitoring: "Surveillance tensionnelle et œdèmes",
        evidenceLevel: "A",
        fdaApproved: true,
      },
      {
        id: "med7",
        name: "Atorvastatine",
        internationalName: "Atorvastatin",
        dosage: "20mg",
        frequency: "1 fois par jour le soir",
        duration: "Traitement au long cours",
        indication: "Hypercholestérolémie",
        priority: "medium",
        selected: false,
        contraindications: {
          absolute: ["Maladie hépatique active"],
          relative: ["Myopathie", "Grossesse"],
        },
        monitoring: "Surveillance hépatique et musculaire",
        evidenceLevel: "A",
        fdaApproved: true,
      },

      // Diabète
      {
        id: "med8",
        name: "Metformine",
        internationalName: "Metformin",
        dosage: "850mg",
        frequency: "2 fois par jour",
        duration: "Traitement au long cours",
        indication: "Diabète de type 2",
        priority: "high",
        selected: false,
        contraindications: {
          absolute: ["Insuffisance rénale sévère (DFG < 30)", "Acidose métabolique"],
          relative: ["Insuffisance cardiaque", "Alcoolisme"],
        },
        monitoring: "Surveillance rénale, vitamine B12",
        evidenceLevel: "A",
        fdaApproved: true,
      },

      // Gastro-entérologie
      {
        id: "med9",
        name: "Oméprazole",
        internationalName: "Omeprazole",
        dosage: "20mg",
        frequency: "1 fois par jour",
        duration: "4 semaines",
        indication: "Protection gastrique",
        priority: "medium",
        selected: false,
        contraindications: {
          absolute: [],
          relative: ["Ostéoporose", "Carence en vitamine B12"],
        },
        monitoring: "Surveillance à long terme (magnésium, B12)",
        evidenceLevel: "A",
        fdaApproved: true,
      },
      {
        id: "med10",
        name: "Dompéridone",
        internationalName: "Domperidone",
        dosage: "10mg",
        frequency: "3 fois par jour avant les repas",
        duration: "7 jours",
        indication: "Nausées et vomissements",
        priority: "low",
        selected: false,
        contraindications: {
          absolute: ["Prolactinome", "Troubles du rythme cardiaque"],
          relative: ["Insuffisance hépatique"],
        },
        monitoring: "Surveillance cardiaque",
        evidenceLevel: "B",
        fdaApproved: false,
      },

      // Respiratoire
      {
        id: "med11",
        name: "Salbutamol",
        internationalName: "Salbutamol",
        dosage: "100µg",
        frequency: "2 bouffées 4 fois par jour",
        duration: "Selon besoin",
        indication: "Bronchodilatation",
        priority: "medium",
        selected: false,
        contraindications: {
          absolute: ["Hypersensibilité"],
          relative: ["Hyperthyroïdie", "Troubles du rythme"],
        },
        monitoring: "Surveillance cardiaque et glycémique",
        evidenceLevel: "A",
        fdaApproved: true,
      },

      // Neurologie/Psychiatrie
      {
        id: "med12",
        name: "Lorazépam",
        internationalName: "Lorazepam",
        dosage: "1mg",
        frequency: "2 fois par jour",
        duration: "7 jours maximum",
        indication: "Anxiété",
        priority: "low",
        selected: false,
        contraindications: {
          absolute: ["Myasthénie", "Insuffisance respiratoire sévère"],
          relative: ["Âge > 65 ans", "Dépendance"],
        },
        monitoring: "Surveillance neurologique et dépendance",
        evidenceLevel: "B",
        fdaApproved: true,
      },
    ]

    // Fusionner tous les médicaments en évitant les doublons
    const allMedications = [...aiRecommendedMedications, ...standardMedications]

    // Éliminer les doublons basés sur le nom
    const uniqueMedications = allMedications.filter(
      (med, index, self) => index === self.findIndex((m) => m.name.toLowerCase() === med.name.toLowerCase()),
    )

    console.log(
      "✅ Médicaments initialisés:",
      uniqueMedications.length,
      "médicaments dont",
      aiRecommendedMedications.length,
      "recommandés par IA",
    )
    console.log("💊 Médicaments auto-sélectionnés:", uniqueMedications.filter((m) => m.selected).length)

    setSelectedMedications(uniqueMedications)

    // Charger les données FDA et RxNorm si disponibles
    if (allData?.diagnosisData?.data?.externalData?.fda) {
      setFdaData(allData.diagnosisData.data.externalData.fda)
    }
    if (allData?.diagnosisData?.data?.externalData?.rxnorm) {
      setRxnormData(allData.diagnosisData.data.externalData.rxnorm)
    }
  }, [allData?.diagnosisData])

  const toggleMedication = (medicationId: string) => {
    setSelectedMedications((prev) =>
      prev.map((med) => (med.id === medicationId ? { ...med, selected: !med.selected } : med)),
    )
  }

  const addCustomMedication = () => {
    if (customMedication.name.trim()) {
      const newMedication: Medication = {
        id: `custom_${Date.now()}`,
        name: customMedication.name.trim(),
        dosage: customMedication.dosage.trim() || "À définir",
        frequency: customMedication.frequency.trim() || "Selon prescription",
        duration: customMedication.duration.trim() || "Selon indication",
        indication: customMedication.indication.trim() || "Traitement personnalisé",
        priority: "medium",
        selected: true,
        contraindications: { absolute: [], relative: [] },
        monitoring: "Surveillance clinique",
        evidenceLevel: "C",
        fdaApproved: false,
      }
      setSelectedMedications((prev) => [...prev, newMedication])
      setCustomMedication({
        name: "",
        dosage: "",
        frequency: "",
        duration: "",
        indication: "",
      })
    }
  }

  const generatePrescription = () => {
    const selected = selectedMedications.filter((med) => med.selected)
    if (selected.length === 0) return

    const prescription: GeneratedPrescription = {
      id: "medication_prescription",
      title: "Ordonnance Médicamenteuse",
      medications: selected,
      content: generateMedicationPrescription(selected),
    }

    setGeneratedPrescription(prescription)
    setShowPrescription(true)
  }

  const generateMedicationPrescription = (medications: Medication[]) => {
    const patientName = `${allData?.patientData?.firstName || "Prénom"} ${allData?.patientData?.lastName || "Nom"}`
    const patientAge = allData?.patientData?.age || "XX"
    const patientWeight = allData?.patientData?.weight || "XX"
    const today = new Date().toLocaleDateString("fr-FR")

    // Séparer les médicaments par priorité
    const highPriorityMeds = medications.filter((m) => m.priority === "high")
    const mediumPriorityMeds = medications.filter((m) => m.priority === "medium")
    const lowPriorityMeds = medications.filter((m) => m.priority === "low")

    return `ORDONNANCE MÉDICAMENTEUSE

Dr. [Nom du Médecin]
[Adresse du Cabinet]
[Téléphone]
[Email]

Date: ${today}

PATIENT:
Nom: ${patientName}
Âge: ${patientAge} ans
Poids: ${patientWeight} kg
Né(e) le: ${allData?.patientData?.birthDate || "XX/XX/XXXX"}
Sécurité Sociale: ${allData?.patientData?.socialSecurity || "XXXXXXXXXXXXXXX"}

DIAGNOSTIC:
${allData?.diagnosisData?.data?.comprehensiveDiagnosis?.primary?.condition || "À préciser"}
Code ICD-10: ${allData?.diagnosisData?.data?.comprehensiveDiagnosis?.primary?.icd10 || ""}

${
  highPriorityMeds.length > 0
    ? `
TRAITEMENT PRIORITAIRE:
${highPriorityMeds
  .map(
    (med, index) => `${index + 1}. ${med.name}${med.internationalName ? ` (${med.internationalName})` : ""}
   Dosage: ${med.dosage}
   Posologie: ${med.frequency}
   Durée: ${med.duration}
   Indication: ${med.indication}${med.aiRecommended ? " [Recommandé par IA]" : ""}
   ${med.evidenceLevel ? `Evidence Level: ${med.evidenceLevel}` : ""}${med.fdaApproved ? " - FDA Approuvé" : ""}
   
   CONTRE-INDICATIONS:
   ${med.contraindications?.absolute?.length ? `• Absolues: ${med.contraindications.absolute.join(", ")}` : ""}
   ${med.contraindications?.relative?.length ? `• Relatives: ${med.contraindications.relative.join(", ")}` : ""}
   
   SURVEILLANCE: ${med.monitoring || "Surveillance clinique"}
`,
  )
  .join("\n")}
`
    : ""
}

${
  mediumPriorityMeds.length > 0
    ? `
TRAITEMENT COMPLÉMENTAIRE:
${mediumPriorityMeds
  .map(
    (
      med,
      index,
    ) => `${highPriorityMeds.length + index + 1}. ${med.name}${med.internationalName ? ` (${med.internationalName})` : ""}
   Dosage: ${med.dosage}
   Posologie: ${med.frequency}
   Durée: ${med.duration}
   Indication: ${med.indication}${med.aiRecommended ? " [Recommandé par IA]" : ""}
   ${med.evidenceLevel ? `Evidence Level: ${med.evidenceLevel}` : ""}${med.fdaApproved ? " - FDA Approuvé" : ""}
   
   CONTRE-INDICATIONS:
   ${med.contraindications?.absolute?.length ? `• Absolues: ${med.contraindications.absolute.join(", ")}` : ""}
   ${med.contraindications?.relative?.length ? `• Relatives: ${med.contraindications.relative.join(", ")}` : ""}
   
   SURVEILLANCE: ${med.monitoring || "Surveillance clinique"}
`,
  )
  .join("\n")}
`
    : ""
}

${
  lowPriorityMeds.length > 0
    ? `
TRAITEMENT SYMPTOMATIQUE (si besoin):
${lowPriorityMeds
  .map(
    (
      med,
      index,
    ) => `${highPriorityMeds.length + mediumPriorityMeds.length + index + 1}. ${med.name}${med.internationalName ? ` (${med.internationalName})` : ""}
   Dosage: ${med.dosage}
   Posologie: ${med.frequency}
   Durée: ${med.duration}
   Indication: ${med.indication}${med.aiRecommended ? " [Recommandé par IA]" : ""}
   ${med.evidenceLevel ? `Evidence Level: ${med.evidenceLevel}` : ""}${med.fdaApproved ? " - FDA Approuvé" : ""}
   
   CONTRE-INDICATIONS:
   ${med.contraindications?.absolute?.length ? `• Absolues: ${med.contraindications.absolute.join(", ")}` : ""}
   ${med.contraindications?.relative?.length ? `• Relatives: ${med.contraindications.relative.join(", ")}` : ""}
   
   SURVEILLANCE: ${med.monitoring || "Surveillance clinique"}
`,
  )
  .join("\n")}
`
    : ""
}

RECOMMANDATIONS GÉNÉRALES:
• Respecter les posologies et durées prescrites
• Signaler tout effet indésirable
• Ne pas arrêter brutalement les traitements
• Conserver les médicaments dans leur emballage d'origine
• Tenir hors de portée des enfants

INTERACTIONS MÉDICAMENTEUSES:
• Vérifier les interactions avec les traitements en cours
• Informer tous les professionnels de santé de cette prescription
• Éviter l'automédication

SURVEILLANCE CLINIQUE:
• Contrôle médical selon indication
• Surveillance biologique si nécessaire
• Adaptation posologique selon tolérance et efficacité

${
  fdaData?.drugs?.length > 0
    ? `
DONNÉES FDA INTÉGRÉES:
${fdaData.drugs
  .slice(0, 3)
  .map((drug: any) => `• ${drug.generic_name} (${drug.brand_name}) - Status: ${drug.status}`)
  .join("\n")}
`
    : ""
}

${
  rxnormData?.length > 0
    ? `
NORMALISATION RxNorm:
${rxnormData
  .slice(0, 3)
  .map((drug: any) => `• ${drug.name} - CUI: ${drug.cui}`)
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

RENOUVELLEMENT: ${medications.some((m) => m.duration.includes("long cours")) ? "OUI" : "NON"}

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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high":
        return <AlertTriangle className="h-3 w-3" />
      case "medium":
        return <Clock className="h-3 w-3" />
      case "low":
        return <CheckCircle className="h-3 w-3" />
      default:
        return <Pill className="h-3 w-3" />
    }
  }

  const handleSubmit = () => {
    const medicationData = {
      selectedMedications: selectedMedications.filter((m) => m.selected),
      prescription: generatedPrescription,
      fdaEvidence: fdaData,
      rxnormData: rxnormData,
      aiRecommendationsUsed: selectedMedications.filter((m) => m.selected && m.aiRecommended).length,
      totalMedicationsSelected: selectedMedications.filter((m) => m.selected).length,
      completedAt: new Date().toISOString(),
    }
    onDataChange(medicationData)
    onNext()
  }

  if (showPrescription && generatedPrescription) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Ordonnance Médicamenteuse Générée</h2>
          <Button onClick={() => setShowPrescription(false)} variant="outline">
            Retour aux Médicaments
          </Button>
        </div>

        {/* Evidence FDA/RxNorm */}
        {(fdaData?.drugs?.length > 0 || rxnormData?.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                Données Pharmacologiques Intégrées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {fdaData?.drugs?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">FDA - Médicaments Approuvés</h4>
                    <div className="space-y-2">
                      {fdaData.drugs.slice(0, 3).map((drug: any, index: number) => (
                        <div key={index} className="border-l-4 border-green-500 pl-3 py-1">
                          <p className="font-medium text-sm">{drug.generic_name}</p>
                          <p className="text-xs text-gray-600">
                            {drug.brand_name} - Status: {drug.status}
                          </p>
                          <p className="text-xs text-gray-500">Indications: {drug.indications?.join(", ")}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {rxnormData?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">RxNorm - Normalisation</h4>
                    <div className="space-y-2">
                      {rxnormData.slice(0, 3).map((drug: any, index: number) => (
                        <div key={index} className="border-l-4 border-blue-500 pl-3 py-1">
                          <p className="font-medium text-sm">{drug.name}</p>
                          <p className="text-xs text-gray-600">CUI: {drug.cui}</p>
                          <p className="text-xs text-gray-500">Type: {drug.tty}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ordonnance générée */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Pill className="h-5 w-5 text-blue-600" />
                {generatedPrescription.title}
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => downloadPrescription(generatedPrescription)}>
                  <Download className="h-4 w-4 mr-1" />
                  Télécharger
                </Button>
                <Button size="sm" variant="outline" onClick={() => printPrescription(generatedPrescription)}>
                  <Printer className="h-4 w-4 mr-1" />
                  Imprimer
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Badge variant="secondary" className="mr-2">
                {generatedPrescription.medications.length} médicaments
              </Badge>
              <Badge variant="secondary">
                {generatedPrescription.medications.filter((m) => m.aiRecommended).length} recommandés par IA
              </Badge>
              <Badge variant="secondary" className="ml-2">
                {generatedPrescription.medications.filter((m) => m.fdaApproved).length} FDA approuvés
              </Badge>
            </div>
            <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg border max-h-96 overflow-y-auto">
              {generatedPrescription.content}
            </pre>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button onClick={onPrevious} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Précédent
          </Button>
          <Button onClick={handleSubmit}>
            Finaliser le Diagnostic
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  const selectedCount = selectedMedications.filter((m) => m.selected).length
  const aiRecommendedCount = selectedMedications.filter((m) => m.aiRecommended).length
  const aiSelectedCount = selectedMedications.filter((m) => m.selected && m.aiRecommended).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Prescription Médicamenteuse</h2>
          <p className="text-gray-600">Sélectionnez les médicaments appropriés pour le traitement</p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-600">
            {selectedCount} médicaments sélectionnés
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

      {/* Médicaments recommandés par IA */}
      {selectedMedications.filter((m) => m.aiRecommended).length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-800">
              <Brain className="h-5 w-5" />
              Médicaments Recommandés par l'IA Diagnostique ({selectedMedications.filter((m) => m.aiRecommended).length}
              )
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {selectedMedications
                .filter((m) => m.aiRecommended)
                .map((medication) => (
                  <div key={medication.id} className="flex items-start space-x-3 p-4 bg-white rounded-lg border">
                    <Checkbox
                      id={medication.id}
                      checked={medication.selected}
                      onCheckedChange={() => toggleMedication(medication.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Label htmlFor={medication.id} className="font-medium cursor-pointer">
                          {medication.name}
                        </Label>
                        {medication.internationalName && (
                          <Badge variant="outline">{medication.internationalName}</Badge>
                        )}
                        <Badge className={getPriorityColor(medication.priority)} variant="secondary">
                          <div className="flex items-center gap-1">
                            {getPriorityIcon(medication.priority)}
                            {medication.priority}
                          </div>
                        </Badge>
                        {medication.fdaApproved && (
                          <Badge className="bg-green-100 text-green-800" variant="secondary">
                            <Shield className="h-3 w-3 mr-1" />
                            FDA
                          </Badge>
                        )}
                      </div>

                      <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-600 mb-2">
                        <div>
                          <strong>Dosage:</strong> {medication.dosage}
                        </div>
                        <div>
                          <strong>Fréquence:</strong> {medication.frequency}
                        </div>
                        <div>
                          <strong>Durée:</strong> {medication.duration}
                        </div>
                        <div>
                          <strong>Evidence:</strong> {medication.evidenceLevel || "B"}
                        </div>
                      </div>

                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Indication:</strong> {medication.indication}
                      </p>

                      {medication.contraindications &&
                        (medication.contraindications.absolute.length > 0 ||
                          medication.contraindications.relative.length > 0) && (
                          <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                            {medication.contraindications.absolute.length > 0 && (
                              <div>
                                <strong>Contre-indications absolues:</strong>{" "}
                                {medication.contraindications.absolute.join(", ")}
                              </div>
                            )}
                            {medication.contraindications.relative.length > 0 && (
                              <div>
                                <strong>Contre-indications relatives:</strong>{" "}
                                {medication.contraindications.relative.join(", ")}
                              </div>
                            )}
                          </div>
                        )}

                      {medication.monitoring && (
                        <p className="text-xs text-blue-600 mt-1">
                          <strong>Surveillance:</strong> {medication.monitoring}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Médicaments par catégorie */}
      {["high", "medium", "low"].map((priority) => {
        const meds = selectedMedications.filter((m) => m.priority === priority && !m.aiRecommended)
        if (meds.length === 0) return null

        const priorityLabels = {
          high: "Priorité Élevée",
          medium: "Priorité Moyenne",
          low: "Traitement Symptomatique",
        }

        const priorityColors = {
          high: "text-red-600",
          medium: "text-yellow-600",
          low: "text-green-600",
        }

        return (
          <Card key={priority}>
            <CardHeader>
              <CardTitle
                className={`flex items-center gap-2 ${priorityColors[priority as keyof typeof priorityColors]}`}
              >
                <Pill className="h-5 w-5" />
                {priorityLabels[priority as keyof typeof priorityLabels]}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {meds.map((medication) => (
                  <div key={medication.id} className="flex items-start space-x-3 p-3 hover:bg-gray-50 rounded">
                    <Checkbox
                      id={medication.id}
                      checked={medication.selected}
                      onCheckedChange={() => toggleMedication(medication.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Label htmlFor={medication.id} className="font-medium cursor-pointer">
                          {medication.name}
                        </Label>
                        {medication.internationalName && (
                          <Badge variant="outline">{medication.internationalName}</Badge>
                        )}
                        {medication.fdaApproved && (
                          <Badge className="bg-green-100 text-green-800" variant="secondary">
                            <Shield className="h-3 w-3 mr-1" />
                            FDA
                          </Badge>
                        )}
                      </div>

                      <div className="grid md:grid-cols-3 gap-2 text-sm text-gray-600 mb-1">
                        <div>{medication.dosage}</div>
                        <div>{medication.frequency}</div>
                        <div>{medication.duration}</div>
                      </div>

                      <p className="text-sm text-gray-700">{medication.indication}</p>

                      {medication.contraindications?.absolute.length > 0 && (
                        <p className="text-xs text-red-600 mt-1">
                          ⚠️ {medication.contraindications.absolute.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}

      {/* Médicament personnalisé */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Ajouter un Médicament Personnalisé
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="custom-name">Nom du médicament</Label>
              <Input
                id="custom-name"
                placeholder="Nom du médicament"
                value={customMedication.name}
                onChange={(e) => setCustomMedication((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="custom-dosage">Dosage</Label>
              <Input
                id="custom-dosage"
                placeholder="ex: 500mg"
                value={customMedication.dosage}
                onChange={(e) => setCustomMedication((prev) => ({ ...prev, dosage: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="custom-frequency">Fréquence</Label>
              <Input
                id="custom-frequency"
                placeholder="ex: 3 fois par jour"
                value={customMedication.frequency}
                onChange={(e) => setCustomMedication((prev) => ({ ...prev, frequency: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="custom-duration">Durée</Label>
              <Input
                id="custom-duration"
                placeholder="ex: 7 jours"
                value={customMedication.duration}
                onChange={(e) => setCustomMedication((prev) => ({ ...prev, duration: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="custom-indication">Indication</Label>
              <Textarea
                id="custom-indication"
                placeholder="Indication thérapeutique"
                value={customMedication.indication}
                onChange={(e) => setCustomMedication((prev) => ({ ...prev, indication: e.target.value }))}
              />
            </div>
          </div>
          <Button onClick={addCustomMedication} disabled={!customMedication.name.trim()} className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter le Médicament
          </Button>

          {/* Médicaments personnalisés ajoutés */}
          {selectedMedications.filter((m) => m.id.startsWith("custom_")).length > 0 && (
            <div className="mt-4 space-y-2">
              <Separator />
              <h4 className="font-medium">Médicaments Personnalisés</h4>
              {selectedMedications
                .filter((m) => m.id.startsWith("custom_"))
                .map((medication) => (
                  <div key={medication.id} className="flex items-start space-x-3 p-2 bg-gray-50 rounded">
                    <Checkbox
                      id={medication.id}
                      checked={medication.selected}
                      onCheckedChange={() => toggleMedication(medication.id)}
                    />
                    <div className="flex-1">
                      <Label htmlFor={medication.id} className="font-medium cursor-pointer">
                        {medication.name}
                      </Label>
                      <div className="text-sm text-gray-600">
                        {medication.dosage} - {medication.frequency} - {medication.duration}
                      </div>
                      <p className="text-sm text-gray-700">{medication.indication}</p>
                    </div>
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
          <Button onClick={generatePrescription} disabled={selectedCount === 0} variant="outline">
            <Pill className="h-4 w-4 mr-2" />
            Générer Ordonnance ({selectedCount})
          </Button>
          <Button onClick={handleSubmit} disabled={selectedCount === 0}>
            Finaliser le Diagnostic
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}
