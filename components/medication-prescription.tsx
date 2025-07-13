"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Pill, Plus, Trash2, Download, Printer, AlertTriangle, ArrowLeft, ArrowRight, Brain } from "lucide-react"

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
  dosage: string
  frequency: string
  duration: string
  indication: string
  contraindications: string[]
  sideEffects: string[]
  interactions: string[]
  isAIRecommended: boolean
  priority: "high" | "medium" | "low"
}

export default function MedicationPrescription({
  data = {},
  allData,
  onDataChange,
  onNext,
  onPrevious,
}: MedicationPrescriptionProps) {
  const [medications, setMedications] = useState<Medication[]>([])
  const [customMedication, setCustomMedication] = useState({
    name: "",
    dosage: "",
    frequency: "",
    duration: "",
    indication: "",
  })
  const [generatedPrescription, setGeneratedPrescription] = useState("")
  const [showPrescription, setShowPrescription] = useState(false)

  // Initialiser avec les médicaments recommandés par l'IA
  useEffect(() => {
    if (allData?.diagnosisData?.recommendations?.medications) {
      const aiMedications: Medication[] = allData.diagnosisData.recommendations.medications.map(
        (med: any, index: number) => ({
          id: `ai_med_${index}`,
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration || "À définir",
          indication: med.indication,
          contraindications: med.contraindications || [],
          sideEffects: med.sideEffects || [],
          interactions: med.interactions || [],
          isAIRecommended: true,
          priority: med.priority || "medium",
        }),
      )
      setMedications(aiMedications)
    }
  }, [allData?.diagnosisData])

  const addCustomMedication = () => {
    if (customMedication.name.trim()) {
      const newMedication: Medication = {
        id: `custom_med_${Date.now()}`,
        name: customMedication.name,
        dosage: customMedication.dosage,
        frequency: customMedication.frequency,
        duration: customMedication.duration,
        indication: customMedication.indication,
        contraindications: [],
        sideEffects: [],
        interactions: [],
        isAIRecommended: false,
        priority: "medium",
      }
      setMedications((prev) => [...prev, newMedication])
      setCustomMedication({
        name: "",
        dosage: "",
        frequency: "",
        duration: "",
        indication: "",
      })
    }
  }

  const removeMedication = (id: string) => {
    setMedications((prev) => prev.filter((med) => med.id !== id))
  }

  const updateMedication = (id: string, field: keyof Medication, value: any) => {
    setMedications((prev) => prev.map((med) => (med.id === id ? { ...med, [field]: value } : med)))
  }

  const generatePrescription = () => {
    const patientName = `${allData?.patientData?.firstName || "Prénom"} ${allData?.patientData?.lastName || "Nom"}`
    const patientAge = allData?.patientData?.age || "XX"
    const today = new Date().toLocaleDateString("fr-FR")

    const prescription = `ORDONNANCE MÉDICALE

Dr. [Nom du Médecin]
[Adresse du Cabinet]
[Téléphone]
[Email]

Date: ${today}

PATIENT:
Nom: ${patientName}
Âge: ${patientAge} ans
Né(e) le: ${allData?.patientData?.birthDate || "XX/XX/XXXX"}
Poids: ${allData?.patientData?.weight || "XX"} kg
Taille: ${allData?.patientData?.height || "XXX"} cm

DIAGNOSTIC:
${allData?.diagnosisData?.diagnosis?.primary?.condition || "À préciser"}
Code ICD-10: ${allData?.diagnosisData?.diagnosis?.primary?.icd10 || ""}

ANTÉCÉDENTS:
${allData?.patientData?.medicalHistory || "Aucun antécédent particulier"}

ALLERGIES CONNUES:
${allData?.patientData?.allergies || "Aucune allergie connue"}

MÉDICAMENTS ACTUELS:
${allData?.patientData?.currentMedications || "Aucun traitement en cours"}

PRESCRIPTION:

${medications
  .map(
    (med, index) => `${index + 1}. ${med.name}
   Posologie: ${med.dosage}
   Fréquence: ${med.frequency}
   Durée: ${med.duration}
   Indication: ${med.indication}${med.isAIRecommended ? " [Recommandé par IA]" : ""}
   
   Mode d'emploi: À prendre selon les indications ci-dessus
   ${med.contraindications.length > 0 ? `Contre-indications: ${med.contraindications.join(", ")}` : ""}
   ${med.interactions.length > 0 ? `⚠️ Interactions: ${med.interactions.join(", ")}` : ""}`,
  )
  .join("\n\n")}

CONSEILS:
- Respecter scrupuleusement les posologies prescrites
- Ne pas arrêter le traitement sans avis médical
- En cas d'effets indésirables, contacter immédiatement le médecin
- Conserver les médicaments dans leur emballage d'origine
- Tenir hors de portée des enfants

SURVEILLANCE:
- Contrôle médical dans 15 jours
- Bilan biologique si nécessaire
- Consultation en urgence si aggravation

RENOUVELLEMENT:
${medications.some((med) => med.duration.includes("mois")) ? "Renouvellement possible" : "Non renouvelable"}

Signature et cachet du médecin

---
Prescription générée avec assistance IA - Medical AI Expert
Date de génération: ${new Date().toLocaleString("fr-FR")}`

    setGeneratedPrescription(prescription)
    setShowPrescription(true)
  }

  const downloadPrescription = () => {
    const element = document.createElement("a")
    const file = new Blob([generatedPrescription], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `Ordonnance_${allData?.patientData?.lastName || "Patient"}_${new Date().toISOString().split("T")[0]}.txt`
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
              body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
              pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
              .header { text-align: center; margin-bottom: 30px; }
              .patient-info { background: #f5f5f5; padding: 15px; margin: 20px 0; }
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

  const handleSubmit = () => {
    const prescriptionData = {
      medications,
      generatedPrescription,
      completedAt: new Date().toISOString(),
      totalMedications: medications.length,
      aiRecommendedCount: medications.filter((med) => med.isAIRecommended).length,
    }
    onDataChange(prescriptionData)
    onNext()
  }

  if (showPrescription) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Ordonnance Générée</h2>
          <div className="flex gap-2">
            <Button onClick={() => setShowPrescription(false)} variant="outline">
              Modifier
            </Button>
            <Button onClick={downloadPrescription} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Télécharger
            </Button>
            <Button onClick={printPrescription} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ordonnance Médicale</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg border">{generatedPrescription}</pre>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button onClick={onPrevious} variant="outline">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Retour
          </Button>
          <Button onClick={handleSubmit}>
            Continuer vers le Rapport
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Prescription Médicamenteuse</h2>
        <p className="text-gray-600">
          Prescription pour {allData?.patientData?.firstName} {allData?.patientData?.lastName} - Diagnostic:{" "}
          {allData?.diagnosisData?.diagnosis?.primary?.condition}
        </p>
      </div>

      {/* Médicaments recommandés par l'IA */}
      {medications.filter((med) => med.isAIRecommended).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Médicaments Recommandés par l'IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <Brain className="h-4 w-4" />
              <AlertDescription>
                Ces médicaments ont été automatiquement recommandés par l'IA basés sur le diagnostic et les données
                cliniques.
              </AlertDescription>
            </Alert>
            <div className="space-y-4">
              {medications
                .filter((med) => med.isAIRecommended)
                .map((medication) => (
                  <div key={medication.id} className="border rounded-lg p-4 bg-purple-50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-purple-900">{medication.name}</h4>
                      <div className="flex gap-2">
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                          <Brain className="h-3 w-3 mr-1" />
                          IA
                        </Badge>
                        <Badge
                          variant={
                            medication.priority === "high"
                              ? "destructive"
                              : medication.priority === "medium"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {medication.priority === "high"
                            ? "Priorité haute"
                            : medication.priority === "medium"
                              ? "Priorité moyenne"
                              : "Priorité basse"}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor={`dosage-${medication.id}`}>Posologie</Label>
                        <Input
                          id={`dosage-${medication.id}`}
                          value={medication.dosage}
                          onChange={(e) => updateMedication(medication.id, "dosage", e.target.value)}
                          placeholder="Ex: 500mg"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`frequency-${medication.id}`}>Fréquence</Label>
                        <Input
                          id={`frequency-${medication.id}`}
                          value={medication.frequency}
                          onChange={(e) => updateMedication(medication.id, "frequency", e.target.value)}
                          placeholder="Ex: 2 fois par jour"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`duration-${medication.id}`}>Durée</Label>
                        <Input
                          id={`duration-${medication.id}`}
                          value={medication.duration}
                          onChange={(e) => updateMedication(medication.id, "duration", e.target.value)}
                          placeholder="Ex: 7 jours"
                        />
                      </div>
                      <div>
                        <Label htmlFor={`indication-${medication.id}`}>Indication</Label>
                        <Input
                          id={`indication-${medication.id}`}
                          value={medication.indication}
                          onChange={(e) => updateMedication(medication.id, "indication", e.target.value)}
                          placeholder="Indication thérapeutique"
                        />
                      </div>
                    </div>

                    {/* Interactions et contre-indications */}
                    {(medication.interactions.length > 0 || medication.contraindications.length > 0) && (
                      <div className="mt-4 space-y-2">
                        {medication.interactions.length > 0 && (
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Interactions:</strong> {medication.interactions.join(", ")}
                            </AlertDescription>
                          </Alert>
                        )}
                        {medication.contraindications.length > 0 && (
                          <Alert>
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Contre-indications:</strong> {medication.contraindications.join(", ")}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end mt-4">
                      <Button
                        onClick={() => removeMedication(medication.id)}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Retirer
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Médicaments personnalisés */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Ajouter un Médicament
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customName">Nom du médicament</Label>
                <Input
                  id="customName"
                  value={customMedication.name}
                  onChange={(e) => setCustomMedication((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Paracétamol"
                />
              </div>
              <div>
                <Label htmlFor="customDosage">Posologie</Label>
                <Input
                  id="customDosage"
                  value={customMedication.dosage}
                  onChange={(e) => setCustomMedication((prev) => ({ ...prev, dosage: e.target.value }))}
                  placeholder="Ex: 1000mg"
                />
              </div>
              <div>
                <Label htmlFor="customFrequency">Fréquence</Label>
                <Input
                  id="customFrequency"
                  value={customMedication.frequency}
                  onChange={(e) => setCustomMedication((prev) => ({ ...prev, frequency: e.target.value }))}
                  placeholder="Ex: 3 fois par jour"
                />
              </div>
              <div>
                <Label htmlFor="customDuration">Durée</Label>
                <Input
                  id="customDuration"
                  value={customMedication.duration}
                  onChange={(e) => setCustomMedication((prev) => ({ ...prev, duration: e.target.value }))}
                  placeholder="Ex: 5 jours"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="customIndication">Indication</Label>
              <Textarea
                id="customIndication"
                value={customMedication.indication}
                onChange={(e) => setCustomMedication((prev) => ({ ...prev, indication: e.target.value }))}
                placeholder="Indication thérapeutique..."
                rows={2}
              />
            </div>
            <Button onClick={addCustomMedication} disabled={!customMedication.name.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Ajouter le Médicament
            </Button>
          </div>

          {/* Afficher les médicaments personnalisés ajoutés */}
          {medications.filter((med) => !med.isAIRecommended).length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium mb-3">Médicaments Ajoutés</h4>
              <div className="space-y-3">
                {medications
                  .filter((med) => !med.isAIRecommended)
                  .map((medication) => (
                    <div key={medication.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">{medication.name}</h4>
                        <Button
                          onClick={() => removeMedication(medication.id)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <strong>Posologie:</strong> {medication.dosage}
                        </div>
                        <div>
                          <strong>Fréquence:</strong> {medication.frequency}
                        </div>
                        <div>
                          <strong>Durée:</strong> {medication.duration}
                        </div>
                        <div>
                          <strong>Indication:</strong> {medication.indication}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Résumé de la prescription */}
      {medications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Résumé de la Prescription ({medications.length} médicaments)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {medications.map((medication, index) => (
                <div key={medication.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="font-medium">
                      {index + 1}. {medication.name}
                    </div>
                    <div className="text-sm text-gray-600">
                      {medication.dosage} - {medication.frequency} - {medication.duration}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {medication.isAIRecommended && (
                      <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                        <Brain className="h-3 w-3 mr-1" />
                        IA
                      </Badge>
                    )}
                    <Badge
                      variant={
                        medication.priority === "high"
                          ? "destructive"
                          : medication.priority === "medium"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {medication.priority === "high"
                        ? "Urgent"
                        : medication.priority === "medium"
                          ? "Normal"
                          : "Faible"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Separator />

      <div className="flex justify-between">
        <Button onClick={onPrevious} variant="outline">
          <ArrowLeft className="h-5 w-5 mr-2" />
          Retour Examens
        </Button>
        <div className="flex gap-4">
          <Button
            onClick={generatePrescription}
            disabled={medications.length === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <Pill className="h-4 w-4 mr-2" />
            Générer Ordonnance ({medications.length})
          </Button>
        </div>
      </div>
    </div>
  )
}
