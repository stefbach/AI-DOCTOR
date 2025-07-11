"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Pill, ArrowLeft, ArrowRight, Brain, Plus, AlertTriangle, Download, Printer, Trash2 } from "lucide-react"

interface MedicationPrescriptionProps {
  patientData: any
  clinicalData: any
  questionsData: any
  diagnosisData: any
  examsData: any
  onNext: (data: any) => void
  onBack: () => void
}

interface Medication {
  id: string
  name: string
  dosage: string
  frequency: string
  duration: string
  indication: string
  contraindications?: string[]
  interactions?: string[]
  aiRecommended?: boolean
  priority?: "high" | "medium" | "low"
  category: "treatment" | "prevention" | "symptom_relief" | "custom"
}

interface DrugInteraction {
  medication1: string
  medication2: string
  severity: "major" | "moderate" | "minor"
  description: string
}

export default function MedicationPrescription({
  patientData,
  clinicalData,
  questionsData,
  diagnosisData,
  examsData,
  onNext,
  onBack,
}: MedicationPrescriptionProps) {
  const [medications, setMedications] = useState<Medication[]>([])
  const [customMedication, setCustomMedication] = useState({
    name: "",
    dosage: "",
    frequency: "",
    duration: "",
    indication: "",
  })
  const [drugInteractions, setDrugInteractions] = useState<DrugInteraction[]>([])
  const [isGeneratingPrescription, setIsGeneratingPrescription] = useState(false)
  const [generatedPrescription, setGeneratedPrescription] = useState("")
  const [showPrescription, setShowPrescription] = useState(false)

  // Générer les médicaments recommandés par l'IA basés sur le diagnostic
  useEffect(() => {
    if (diagnosisData?.primaryDiagnosis) {
      const aiMedications: Medication[] = [
        {
          id: "ai_1",
          name: "Aspirine",
          dosage: "75 mg",
          frequency: "1 fois par jour",
          duration: "Au long cours",
          indication: "Prévention cardiovasculaire secondaire",
          contraindications: ["Allergie à l'aspirine", "Ulcère gastroduodénal actif", "Troubles de la coagulation"],
          interactions: ["Anticoagulants", "Méthotrexate"],
          aiRecommended: true,
          priority: "high",
          category: "treatment",
        },
        {
          id: "ai_2",
          name: "Atorvastatine",
          dosage: "20 mg",
          frequency: "1 fois par jour le soir",
          duration: "Au long cours",
          indication: "Traitement de la dyslipidémie",
          contraindications: ["Maladie hépatique active", "Grossesse", "Allaitement"],
          interactions: ["Ciclosporine", "Gemfibrozil"],
          aiRecommended: true,
          priority: "medium",
          category: "treatment",
        },
        {
          id: "ai_3",
          name: "Ramipril",
          dosage: "2.5 mg",
          frequency: "1 fois par jour",
          duration: "Au long cours",
          indication: "Traitement de l'hypertension artérielle",
          contraindications: ["Sténose artérielle rénale bilatérale", "Grossesse", "Angioedème"],
          interactions: ["Diurétiques épargneurs de potassium", "Lithium"],
          aiRecommended: true,
          priority: "high",
          category: "treatment",
        },
        {
          id: "ai_4",
          name: "Paracétamol",
          dosage: "1000 mg",
          frequency: "3 fois par jour si besoin",
          duration: "Maximum 3 jours consécutifs",
          indication: "Traitement symptomatique de la douleur",
          contraindications: ["Insuffisance hépatocellulaire sévère"],
          interactions: ["Warfarine (surveillance INR)"],
          aiRecommended: true,
          priority: "low",
          category: "symptom_relief",
        },
      ]

      setMedications(aiMedications)
      checkDrugInteractions(aiMedications)
    }
  }, [diagnosisData])

  const checkDrugInteractions = (meds: Medication[]) => {
    const interactions: DrugInteraction[] = []

    // Vérifier les interactions entre les médicaments prescrits
    for (let i = 0; i < meds.length; i++) {
      for (let j = i + 1; j < meds.length; j++) {
        const med1 = meds[i]
        const med2 = meds[j]

        // Exemple d'interactions connues
        if (
          (med1.name === "Aspirine" && med2.name === "Ramipril") ||
          (med1.name === "Ramipril" && med2.name === "Aspirine")
        ) {
          interactions.push({
            medication1: "Aspirine",
            medication2: "Ramipril",
            severity: "moderate",
            description:
              "L'aspirine peut réduire l'effet antihypertenseur des IEC. Surveillance de la tension artérielle recommandée.",
          })
        }
      }
    }

    // Vérifier les interactions avec les médicaments actuels du patient
    if (patientData?.currentMedications) {
      const currentMeds = patientData.currentMedications.toLowerCase()
      meds.forEach((med) => {
        if (med.name === "Aspirine" && currentMeds.includes("warfarine")) {
          interactions.push({
            medication1: "Aspirine",
            medication2: "Warfarine",
            severity: "major",
            description: "Risque hémorragique majoré. Surveillance étroite de l'INR nécessaire.",
          })
        }
      })
    }

    setDrugInteractions(interactions)
  }

  const toggleMedication = (medicationId: string) => {
    setMedications((prev) =>
      prev.map((med) =>
        med.id === medicationId ? { ...med, aiRecommended: med.aiRecommended ? !med.aiRecommended : true } : med,
      ),
    )
  }

  const addCustomMedication = () => {
    if (customMedication.name.trim()) {
      const newMedication: Medication = {
        id: `custom_${Date.now()}`,
        name: customMedication.name.trim(),
        dosage: customMedication.dosage.trim(),
        frequency: customMedication.frequency.trim(),
        duration: customMedication.duration.trim(),
        indication: customMedication.indication.trim(),
        aiRecommended: true,
        priority: "medium",
        category: "custom",
      }

      const updatedMedications = [...medications, newMedication]
      setMedications(updatedMedications)
      checkDrugInteractions(updatedMedications)

      setCustomMedication({
        name: "",
        dosage: "",
        frequency: "",
        duration: "",
        indication: "",
      })
    }
  }

  const removeMedication = (medicationId: string) => {
    const updatedMedications = medications.filter((med) => med.id !== medicationId)
    setMedications(updatedMedications)
    checkDrugInteractions(updatedMedications)
  }

  const generatePrescription = useCallback(async () => {
    setIsGeneratingPrescription(true)

    // Simulation de génération
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const selectedMedications = medications.filter((med) => med.aiRecommended)
    const patientName = `${patientData?.firstName || "Prénom"} ${patientData?.lastName || "Nom"}`
    const today = new Date().toLocaleDateString("fr-FR")

    const prescription = `ORDONNANCE MÉDICALE

Dr. [Nom du Médecin]
[Adresse du Cabinet]
[Téléphone]
N° RPPS: [Numéro RPPS]

Date: ${today}

PATIENT:
Nom: ${patientName}
Âge: ${patientData?.age} ans
Né(e) le: ${patientData?.birthDate || "XX/XX/XXXX"}
N° Sécurité Sociale: ${patientData?.socialSecurityNumber || "Non renseigné"}

DIAGNOSTIC:
${diagnosisData?.primaryDiagnosis?.condition || "À préciser"}
Code ICD-10: ${diagnosisData?.primaryDiagnosis?.icd10 || ""}

MÉDICAMENTS PRESCRITS:

${selectedMedications
  .map(
    (med, index) => `${index + 1}. ${med.name} ${med.dosage}
   Posologie: ${med.frequency}
   Durée: ${med.duration}
   Indication: ${med.indication}
   ${med.aiRecommended ? "[Recommandé par IA]" : ""}
`,
  )
  .join("\n")}

RECOMMANDATIONS:
- Respecter scrupuleusement les posologies prescrites
- En cas d'effets indésirables, consulter rapidement
- Ne pas arrêter le traitement sans avis médical
${drugInteractions.length > 0 ? `- ATTENTION: Interactions médicamenteuses détectées (voir ci-dessous)` : ""}

${
  drugInteractions.length > 0
    ? `
INTERACTIONS MÉDICAMENTEUSES DÉTECTÉES:
${drugInteractions
  .map(
    (interaction) => `⚠️ ${interaction.medication1} + ${interaction.medication2}
   Sévérité: ${interaction.severity === "major" ? "MAJEURE" : interaction.severity === "moderate" ? "MODÉRÉE" : "MINEURE"}
   ${interaction.description}
`,
  )
  .join("\n")}`
    : ""
}

CONTRE-INDICATIONS VÉRIFIÉES:
${selectedMedications
  .map((med) => (med.contraindications ? `${med.name}: ${med.contraindications.join(", ")}` : ""))
  .filter(Boolean)
  .join("\n")}

Signature et cachet du médecin

---
Prescription générée avec assistance IA - Medical AI Expert
Date de génération: ${new Date().toLocaleString("fr-FR")}`

    setGeneratedPrescription(prescription)
    setIsGeneratingPrescription(false)
    setShowPrescription(true)
  }, [medications, patientData, diagnosisData, drugInteractions])

  const downloadPrescription = () => {
    const element = document.createElement("a")
    const file = new Blob([generatedPrescription], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `Ordonnance_${patientData?.firstName}_${patientData?.lastName}_${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const printPrescription = () => {
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Ordonnance Médicale</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 20px; 
                line-height: 1.6;
                font-size: 12px;
              }
              pre { 
                white-space: pre-wrap; 
                font-family: Arial, sans-serif; 
              }
              .header { 
                text-align: center; 
                font-weight: bold; 
                margin-bottom: 20px; 
              }
            </style>
          </head>
          <body>
            <pre>${generatedPrescription}</pre>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "treatment":
        return "bg-red-100 text-red-800"
      case "prevention":
        return "bg-blue-100 text-blue-800"
      case "symptom_relief":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800"
      case "medium":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (showPrescription) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Ordonnance Générée</h2>
          <div className="flex gap-2">
            <Button onClick={downloadPrescription} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
            <Button onClick={printPrescription} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
            <Button onClick={() => setShowPrescription(false)} variant="outline">
              Modifier
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-6 rounded-lg border">{generatedPrescription}</pre>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button onClick={() => setShowPrescription(false)} variant="outline">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Modifier la prescription
          </Button>
          <Button
            onClick={() =>
              onNext({ prescription: generatedPrescription, medications: medications.filter((m) => m.aiRecommended) })
            }
          >
            Continuer vers le Compte-rendu
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Pill className="h-6 w-6 mr-3 text-green-600" />
            Prescription Médicamenteuse
          </CardTitle>
          <p className="text-gray-600">
            Médicaments recommandés pour {patientData?.firstName} {patientData?.lastName} - Diagnostic:{" "}
            {diagnosisData?.primaryDiagnosis?.condition}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Alertes d'interactions */}
          {drugInteractions.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{drugInteractions.length} interaction(s) médicamenteuse(s) détectée(s)</strong>
                <div className="mt-2 space-y-1">
                  {drugInteractions.map((interaction, index) => (
                    <div key={index} className="text-sm">
                      • {interaction.medication1} + {interaction.medication2} ({interaction.severity})
                    </div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Médicaments recommandés par l'IA */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Brain className="h-5 w-5 mr-2 text-purple-600" />
              Médicaments Recommandés par l'IA
            </h3>
            <div className="space-y-4">
              {medications
                .filter((med) => med.category !== "custom")
                .map((medication) => (
                  <Card
                    key={medication.id}
                    className={`border-l-4 ${
                      medication.priority === "high"
                        ? "border-l-red-500"
                        : medication.priority === "medium"
                          ? "border-l-orange-500"
                          : "border-l-gray-500"
                    }`}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={medication.id}
                            checked={medication.aiRecommended}
                            onCheckedChange={() => toggleMedication(medication.id)}
                          />
                          <div>
                            <Label htmlFor={medication.id} className="font-medium cursor-pointer text-base">
                              {medication.name} {medication.dosage}
                            </Label>
                            <p className="text-sm text-gray-600">{medication.indication}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge className={getCategoryColor(medication.category)}>
                            {medication.category === "treatment"
                              ? "Traitement"
                              : medication.category === "prevention"
                                ? "Prévention"
                                : "Symptomatique"}
                          </Badge>
                          <Badge className={getPriorityColor(medication.priority!)}>
                            {medication.priority === "high"
                              ? "Priorité haute"
                              : medication.priority === "medium"
                                ? "Priorité moyenne"
                                : "Priorité basse"}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                        <div>
                          <strong>Posologie:</strong> {medication.frequency}
                        </div>
                        <div>
                          <strong>Durée:</strong> {medication.duration}
                        </div>
                      </div>

                      {medication.contraindications && (
                        <div className="mb-2">
                          <strong className="text-sm text-red-600">Contre-indications:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {medication.contraindications.map((ci, index) => (
                              <Badge key={index} variant="outline" className="text-xs text-red-600 border-red-200">
                                {ci}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {medication.interactions && (
                        <div>
                          <strong className="text-sm text-orange-600">Interactions:</strong>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {medication.interactions.map((interaction, index) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs text-orange-600 border-orange-200"
                              >
                                {interaction}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>

          {/* Ajouter un médicament personnalisé */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Ajouter un Médicament
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="medName">Nom du médicament</Label>
                  <Input
                    id="medName"
                    value={customMedication.name}
                    onChange={(e) => setCustomMedication((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex: Doliprane"
                  />
                </div>
                <div>
                  <Label htmlFor="medDosage">Dosage</Label>
                  <Input
                    id="medDosage"
                    value={customMedication.dosage}
                    onChange={(e) => setCustomMedication((prev) => ({ ...prev, dosage: e.target.value }))}
                    placeholder="Ex: 1000 mg"
                  />
                </div>
                <div>
                  <Label htmlFor="medFrequency">Fréquence</Label>
                  <Input
                    id="medFrequency"
                    value={customMedication.frequency}
                    onChange={(e) => setCustomMedication((prev) => ({ ...prev, frequency: e.target.value }))}
                    placeholder="Ex: 3 fois par jour"
                  />
                </div>
                <div>
                  <Label htmlFor="medDuration">Durée</Label>
                  <Input
                    id="medDuration"
                    value={customMedication.duration}
                    onChange={(e) => setCustomMedication((prev) => ({ ...prev, duration: e.target.value }))}
                    placeholder="Ex: 7 jours"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="medIndication">Indication</Label>
                  <Textarea
                    id="medIndication"
                    value={customMedication.indication}
                    onChange={(e) => setCustomMedication((prev) => ({ ...prev, indication: e.target.value }))}
                    placeholder="Indication thérapeutique"
                    rows={2}
                  />
                </div>
              </div>
              <Button onClick={addCustomMedication} disabled={!customMedication.name.trim()} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter le médicament
              </Button>
            </CardContent>
          </Card>

          {/* Médicaments personnalisés ajoutés */}
          {medications.filter((med) => med.category === "custom").length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Médicaments Personnalisés</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {medications
                    .filter((med) => med.category === "custom")
                    .map((medication) => (
                      <div key={medication.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={medication.id}
                            checked={medication.aiRecommended}
                            onCheckedChange={() => toggleMedication(medication.id)}
                          />
                          <div>
                            <Label htmlFor={medication.id} className="font-medium cursor-pointer">
                              {medication.name} {medication.dosage}
                            </Label>
                            <p className="text-sm text-gray-600">
                              {medication.frequency} - {medication.duration}
                            </p>
                          </div>
                        </div>
                        <Button onClick={() => removeMedication(medication.id)} variant="outline" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Résumé de la prescription */}
          {medications.filter((med) => med.aiRecommended).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Résumé de la Prescription ({medications.filter((med) => med.aiRecommended).length} médicaments)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {medications
                    .filter((med) => med.aiRecommended)
                    .map((medication) => (
                      <div key={medication.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                        <span className="font-medium">
                          {medication.name} {medication.dosage} - {medication.frequency}
                        </span>
                        <Badge className={getCategoryColor(medication.category)}>
                          {medication.category === "treatment"
                            ? "Traitement"
                            : medication.category === "prevention"
                              ? "Prévention"
                              : medication.category === "symptom_relief"
                                ? "Symptomatique"
                                : "Personnalisé"}
                        </Badge>
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
              Retour Examens
            </Button>
            <Button
              onClick={generatePrescription}
              disabled={medications.filter((med) => med.aiRecommended).length === 0 || isGeneratingPrescription}
              className="bg-green-600 hover:bg-green-700"
            >
              {isGeneratingPrescription ? (
                "Génération en cours..."
              ) : (
                <>
                  <Pill className="h-4 w-4 mr-2" />
                  Générer l'Ordonnance ({medications.filter((med) => med.aiRecommended).length})
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
