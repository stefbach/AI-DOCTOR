"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Pill, User, Plus, Trash2, AlertTriangle } from "lucide-react"

interface MedicationPrescriptionProps {
  patientData: any
  clinicalData: any
  enhancedResults: any
  prescriptionData: any
}

interface Medication {
  id: string
  name: string
  strength: string
  form: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
  quantity: string
  refills: string
  generic: boolean
}

export default function MedicationPrescription({
  patientData,
  clinicalData,
  enhancedResults,
  prescriptionData,
}: MedicationPrescriptionProps) {
  const [doctorInfo, setDoctorInfo] = useState({
    name: "Dr. Jean MARTIN",
    specialty: "Médecine Générale",
    rpps: "12345678901",
    address: "123 Avenue de la Santé, 75000 Paris",
    phone: "01.23.45.67.89",
    adeli: "751234567",
  })

  const [prescInfo, setPrescInfo] = useState({
    prescriptionDate: new Date().toLocaleDateString("fr-FR"),
    validityPeriod: "3 mois",
    additionalNotes: "",
    renewalInstructions: "",
  })

  const [medications, setMedications] = useState<Medication[]>(() => {
    // Initialiser avec les médicaments de prescriptionData s'ils existent
    if (prescriptionData?.prescription?.medications) {
      return prescriptionData.prescription.medications.map((med: any, index: number) => ({
        id: `med-${index}`,
        name: med.name || "",
        strength: med.strength || "",
        form: med.form || "Comprimé",
        dosage: med.dosage || "",
        frequency: med.frequency || "",
        duration: med.duration || "",
        instructions: med.instructions || "",
        quantity: med.quantity || "",
        refills: med.refills || "0",
        generic: med.generic || false,
      }))
    }
    return [
      {
        id: "med-1",
        name: "",
        strength: "",
        form: "Comprimé",
        dosage: "",
        frequency: "",
        duration: "",
        instructions: "",
        quantity: "",
        refills: "0",
        generic: false,
      },
    ]
  })

  const handleDoctorChange = useCallback((field: string, value: string) => {
    setDoctorInfo((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handlePrescInfoChange = useCallback((field: string, value: string) => {
    setPrescInfo((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleMedicationChange = useCallback((id: string, field: string, value: string | boolean) => {
    setMedications((prev) => prev.map((med) => (med.id === id ? { ...med, [field]: value } : med)))
  }, [])

  const addMedication = useCallback(() => {
    const newMed: Medication = {
      id: `med-${Date.now()}`,
      name: "",
      strength: "",
      form: "Comprimé",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
      quantity: "",
      refills: "0",
      generic: false,
    }
    setMedications((prev) => [...prev, newMed])
  }, [])

  const removeMedication = useCallback((id: string) => {
    setMedications((prev) => prev.filter((med) => med.id !== id))
  }, [])

  const medicationForms = [
    "Comprimé",
    "Gélule",
    "Sirop",
    "Solution",
    "Suspension",
    "Pommade",
    "Crème",
    "Gel",
    "Suppositoire",
    "Injection",
    "Collyre",
    "Spray",
    "Patch",
  ]

  const commonFrequencies = [
    "1 fois par jour",
    "2 fois par jour",
    "3 fois par jour",
    "4 fois par jour",
    "Matin",
    "Soir",
    "Matin et soir",
    "Toutes les 4h",
    "Toutes les 6h",
    "Toutes les 8h",
    "Toutes les 12h",
    "Si besoin",
    "Au coucher",
  ]

  const commonDurations = [
    "3 jours",
    "5 jours",
    "7 jours",
    "10 jours",
    "14 jours",
    "21 jours",
    "1 mois",
    "2 mois",
    "3 mois",
    "6 mois",
    "Traitement au long cours",
  ]

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Configuration praticien */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Informations Praticien (Modifiable)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="doctorName">Nom du médecin</Label>
              <Input
                id="doctorName"
                value={doctorInfo.name}
                onChange={(e) => handleDoctorChange("name", e.target.value)}
                className="mt-1"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            <div>
              <Label htmlFor="specialty">Spécialité</Label>
              <Input
                id="specialty"
                value={doctorInfo.specialty}
                onChange={(e) => handleDoctorChange("specialty", e.target.value)}
                className="mt-1"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            <div>
              <Label htmlFor="rpps">N° RPPS</Label>
              <Input
                id="rpps"
                value={doctorInfo.rpps}
                onChange={(e) => handleDoctorChange("rpps", e.target.value)}
                className="mt-1"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            <div>
              <Label htmlFor="adeli">N° ADELI</Label>
              <Input
                id="adeli"
                value={doctorInfo.adeli}
                onChange={(e) => handleDoctorChange("adeli", e.target.value)}
                className="mt-1"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gestion des médicaments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <Pill className="h-5 w-5 mr-2" />
              Médicaments à Prescrire
            </div>
            <Button onClick={addMedication} size="sm" className="flex items-center">
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {medications.map((medication, index) => (
              <div key={medication.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Médicament {index + 1}</h3>
                  {medications.length > 1 && (
                    <Button onClick={() => removeMedication(medication.id)} variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor={`name-${medication.id}`}>Nom du médicament</Label>
                    <Input
                      id={`name-${medication.id}`}
                      value={medication.name}
                      onChange={(e) => handleMedicationChange(medication.id, "name", e.target.value)}
                      placeholder="Ex: Paracétamol"
                      className="mt-1"
                      autoComplete="off"
                      spellCheck="false"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`strength-${medication.id}`}>Dosage</Label>
                    <Input
                      id={`strength-${medication.id}`}
                      value={medication.strength}
                      onChange={(e) => handleMedicationChange(medication.id, "strength", e.target.value)}
                      placeholder="Ex: 500mg"
                      className="mt-1"
                      autoComplete="off"
                      spellCheck="false"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`form-${medication.id}`}>Forme</Label>
                    <select
                      id={`form-${medication.id}`}
                      value={medication.form}
                      onChange={(e) => handleMedicationChange(medication.id, "form", e.target.value)}
                      className="mt-1 w-full p-2 border border-gray-300 rounded"
                    >
                      {medicationForms.map((form) => (
                        <option key={form} value={form}>
                          {form}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor={`dosage-${medication.id}`}>Posologie</Label>
                    <Input
                      id={`dosage-${medication.id}`}
                      value={medication.dosage}
                      onChange={(e) => handleMedicationChange(medication.id, "dosage", e.target.value)}
                      placeholder="Ex: 1 comprimé"
                      className="mt-1"
                      autoComplete="off"
                      spellCheck="false"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`frequency-${medication.id}`}>Fréquence</Label>
                    <select
                      id={`frequency-${medication.id}`}
                      value={medication.frequency}
                      onChange={(e) => handleMedicationChange(medication.id, "frequency", e.target.value)}
                      className="mt-1 w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="">Sélectionner...</option>
                      {commonFrequencies.map((freq) => (
                        <option key={freq} value={freq}>
                          {freq}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor={`duration-${medication.id}`}>Durée</Label>
                    <select
                      id={`duration-${medication.id}`}
                      value={medication.duration}
                      onChange={(e) => handleMedicationChange(medication.id, "duration", e.target.value)}
                      className="mt-1 w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="">Sélectionner...</option>
                      {commonDurations.map((duration) => (
                        <option key={duration} value={duration}>
                          {duration}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor={`quantity-${medication.id}`}>Quantité</Label>
                    <Input
                      id={`quantity-${medication.id}`}
                      value={medication.quantity}
                      onChange={(e) => handleMedicationChange(medication.id, "quantity", e.target.value)}
                      placeholder="Ex: 30 comprimés"
                      className="mt-1"
                      autoComplete="off"
                      spellCheck="false"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`refills-${medication.id}`}>Renouvellements</Label>
                    <select
                      id={`refills-${medication.id}`}
                      value={medication.refills}
                      onChange={(e) => handleMedicationChange(medication.id, "refills", e.target.value)}
                      className="mt-1 w-full p-2 border border-gray-300 rounded"
                    >
                      <option value="0">0 (pas de renouvellement)</option>
                      <option value="1">1 renouvellement</option>
                      <option value="2">2 renouvellements</option>
                      <option value="3">3 renouvellements</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2 mt-6">
                    <input
                      type="checkbox"
                      id={`generic-${medication.id}`}
                      checked={medication.generic}
                      onChange={(e) => handleMedicationChange(medication.id, "generic", e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor={`generic-${medication.id}`}>Substitution générique autorisée</Label>
                  </div>

                  <div className="md:col-span-3">
                    <Label htmlFor={`instructions-${medication.id}`}>Instructions particulières</Label>
                    <Textarea
                      id={`instructions-${medication.id}`}
                      value={medication.instructions}
                      onChange={(e) => handleMedicationChange(medication.id, "instructions", e.target.value)}
                      placeholder="Ex: À prendre pendant les repas, éviter l'alcool..."
                      rows={2}
                      className="mt-1"
                      autoComplete="off"
                      spellCheck="false"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ordonnance générée */}
      <div className="bg-white p-8 rounded-lg shadow-lg print:shadow-none print:p-6">
        {/* En-tête */}
        <div className="text-center mb-8 print:mb-6">
          <div className="border-b-2 border-green-600 pb-4">
            <h1 className="text-2xl font-bold text-green-800 mb-2">ORDONNANCE MÉDICALE</h1>
            <div className="text-sm text-gray-600">
              <p className="font-semibold">{doctorInfo.name}</p>
              <p>{doctorInfo.specialty}</p>
              <p>
                N° RPPS: {doctorInfo.rpps} | N° ADELI: {doctorInfo.adeli}
              </p>
              <p>{doctorInfo.address}</p>
              <p>Tél: {doctorInfo.phone}</p>
            </div>
          </div>
        </div>

        {/* Informations prescription */}
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div>
            <Label htmlFor="prescDate">Date de prescription</Label>
            <Input
              id="prescDate"
              value={prescInfo.prescriptionDate}
              onChange={(e) => handlePrescInfoChange("prescriptionDate", e.target.value)}
              className="mt-1"
              autoComplete="off"
              spellCheck="false"
            />
          </div>
          <div>
            <Label htmlFor="validity">Validité</Label>
            <select
              id="validity"
              value={prescInfo.validityPeriod}
              onChange={(e) => handlePrescInfoChange("validityPeriod", e.target.value)}
              className="mt-1 w-full p-2 border border-gray-300 rounded"
            >
              <option value="3 mois">3 mois</option>
              <option value="6 mois">6 mois</option>
              <option value="1 an">1 an</option>
            </select>
          </div>
        </div>

        {/* Patient */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
            <User className="h-5 w-5 mr-2" />
            PATIENT
          </h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Nom:</strong> {patientData.name}
              </div>
              <div>
                <strong>Âge:</strong> {patientData.age} ans
              </div>
              <div>
                <strong>Genre:</strong> {patientData.gender}
              </div>
              <div>
                <strong>Poids:</strong> {patientData.weight} kg
              </div>
            </div>
            {patientData.allergies && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                  <strong className="text-red-800">ALLERGIES:</strong>
                </div>
                <p className="text-sm text-red-700 mt-1">{patientData.allergies}</p>
              </div>
            )}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Médicaments prescrits */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Pill className="h-5 w-5 mr-2" />
            MÉDICAMENTS PRESCRITS
          </h2>

          <div className="space-y-4">
            {medications.map((medication, index) => (
              <div key={medication.id} className="border border-gray-300 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-blue-800">
                      {index + 1}. {medication.name} {medication.strength}
                    </h3>
                    <p className="text-sm text-gray-600">{medication.form}</p>
                  </div>
                  {!medication.generic && (
                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-semibold">
                      NON SUBSTITUABLE
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
                    <strong>Quantité:</strong> {medication.quantity}
                  </div>
                  <div>
                    <strong>Renouvellements:</strong> {medication.refills}
                  </div>
                  <div>
                    <strong>Générique:</strong> {medication.generic ? "Autorisé" : "Non autorisé"}
                  </div>
                </div>

                {medication.instructions && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <strong className="text-yellow-800">Instructions:</strong>
                    <p className="text-sm text-yellow-700 mt-1">{medication.instructions}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Instructions générales */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">INSTRUCTIONS GÉNÉRALES</h2>
          <div className="bg-blue-50 p-4 rounded-lg space-y-2 text-sm">
            <p>• Respecter scrupuleusement les posologies et horaires de prise</p>
            <p>• Ne pas arrêter le traitement sans avis médical</p>
            <p>• Signaler tout effet indésirable au médecin</p>
            <p>• Conserver les médicaments dans leur emballage d'origine</p>
            <p>• Tenir hors de portée des enfants</p>
          </div>
        </div>

        {/* Instructions de renouvellement */}
        <div className="mb-6">
          <Label htmlFor="renewalInstructions">Instructions de renouvellement</Label>
          <Textarea
            id="renewalInstructions"
            value={prescInfo.renewalInstructions}
            onChange={(e) => handlePrescInfoChange("renewalInstructions", e.target.value)}
            placeholder="Conditions de renouvellement, suivi nécessaire..."
            rows={2}
            className="mt-1"
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        {/* Notes additionnelles */}
        <div className="mb-6">
          <Label htmlFor="additionalNotes">Notes complémentaires</Label>
          <Textarea
            id="additionalNotes"
            value={prescInfo.additionalNotes}
            onChange={(e) => handlePrescInfoChange("additionalNotes", e.target.value)}
            placeholder="Observations particulières, conseils au patient..."
            rows={3}
            className="mt-1"
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        {/* Signature */}
        <div className="mt-8 pt-6 border-t border-gray-300">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm text-gray-600">Date: {prescInfo.prescriptionDate}</p>
              <p className="text-sm text-gray-600">Validité: {prescInfo.validityPeriod}</p>
              <p className="text-sm text-gray-600">Nombre de médicaments: {medications.length}</p>
            </div>
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2 mt-8 w-48">
                <p className="text-sm font-semibold">{doctorInfo.name}</p>
                <p className="text-xs text-gray-600">{doctorInfo.specialty}</p>
                <p className="text-xs text-gray-600">Signature et cachet</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
