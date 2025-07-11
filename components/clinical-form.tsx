"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Stethoscope, ArrowRight, ArrowLeft, AlertCircle } from "lucide-react"

interface ClinicalFormProps {
  patientData: any
  initialData?: any
  onNext: (data: any) => void
  onBack: () => void
}

export default function ClinicalForm({ patientData, initialData = {}, onNext, onBack }: ClinicalFormProps) {
  const [formData, setFormData] = useState({
    chiefComplaint: initialData?.chiefComplaint || "",
    historyOfPresentIllness: initialData?.historyOfPresentIllness || "",
    symptoms: initialData?.symptoms || "",
    duration: initialData?.duration || "",
    severity: initialData?.severity || "",
    vitals: {
      bloodPressure: initialData?.vitals?.bloodPressure || "",
      heartRate: initialData?.vitals?.heartRate || "",
      temperature: initialData?.vitals?.temperature || "",
      oxygenSaturation: initialData?.vitals?.oxygenSaturation || "",
      respiratoryRate: initialData?.vitals?.respiratoryRate || "",
      painScale: initialData?.vitals?.painScale || "",
    },
    physicalExamination: initialData?.physicalExamination || "",
    reviewOfSystems: initialData?.reviewOfSystems || "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = useCallback(
    (field: string, value: string) => {
      if (field.startsWith("vitals.")) {
        const vitalField = field.split(".")[1]
        setFormData((prev) => ({
          ...prev,
          vitals: { ...prev.vitals, [vitalField]: value },
        }))
      } else {
        setFormData((prev) => ({ ...prev, [field]: value }))
      }

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }))
      }
    },
    [errors],
  )

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.chiefComplaint.trim()) {
      newErrors.chiefComplaint = "Le motif de consultation est requis"
    }
    if (!formData.historyOfPresentIllness.trim()) {
      newErrors.historyOfPresentIllness = "L'histoire de la maladie actuelle est requise"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onNext(formData)
    }
  }

  const isFormValid = formData.chiefComplaint && formData.historyOfPresentIllness

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Stethoscope className="h-6 w-6 mr-3 text-green-600" />
            Examen Clinique
          </CardTitle>
          <p className="text-gray-600">
            Patient: {patientData?.firstName} {patientData?.lastName}, {patientData?.age} ans
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Motif de consultation */}
          <div>
            <Label htmlFor="chiefComplaint">Motif de consultation *</Label>
            <Textarea
              id="chiefComplaint"
              value={formData.chiefComplaint}
              onChange={(e) => handleChange("chiefComplaint", e.target.value)}
              placeholder="Raison principale de la consultation..."
              rows={2}
              className={errors.chiefComplaint ? "border-red-500" : ""}
            />
            {errors.chiefComplaint && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.chiefComplaint}
              </p>
            )}
          </div>

          {/* Histoire de la maladie actuelle */}
          <div>
            <Label htmlFor="historyOfPresentIllness">Histoire de la maladie actuelle *</Label>
            <Textarea
              id="historyOfPresentIllness"
              value={formData.historyOfPresentIllness}
              onChange={(e) => handleChange("historyOfPresentIllness", e.target.value)}
              placeholder="Description détaillée des symptômes, évolution, facteurs déclenchants..."
              rows={4}
              className={errors.historyOfPresentIllness ? "border-red-500" : ""}
            />
            {errors.historyOfPresentIllness && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.historyOfPresentIllness}
              </p>
            )}
          </div>

          {/* Symptômes associés */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="symptoms">Symptômes associés</Label>
              <Textarea
                id="symptoms"
                value={formData.symptoms}
                onChange={(e) => handleChange("symptoms", e.target.value)}
                placeholder="Autres symptômes présents..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="duration">Durée des symptômes</Label>
              <Input
                id="duration"
                value={formData.duration}
                onChange={(e) => handleChange("duration", e.target.value)}
                placeholder="Ex: 3 jours, 2 semaines..."
              />
            </div>
          </div>

          {/* Sévérité */}
          <div>
            <Label htmlFor="severity">Sévérité et impact</Label>
            <Textarea
              id="severity"
              value={formData.severity}
              onChange={(e) => handleChange("severity", e.target.value)}
              placeholder="Impact sur les activités quotidiennes, sévérité des symptômes..."
              rows={2}
            />
          </div>

          {/* Signes vitaux */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Signes vitaux</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="bloodPressure">Tension artérielle</Label>
                <Input
                  id="bloodPressure"
                  value={formData.vitals.bloodPressure}
                  onChange={(e) => handleChange("vitals.bloodPressure", e.target.value)}
                  placeholder="Ex: 120/80"
                />
              </div>

              <div>
                <Label htmlFor="heartRate">Fréquence cardiaque</Label>
                <Input
                  id="heartRate"
                  type="number"
                  value={formData.vitals.heartRate}
                  onChange={(e) => handleChange("vitals.heartRate", e.target.value)}
                  placeholder="bpm"
                />
              </div>

              <div>
                <Label htmlFor="temperature">Température</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  value={formData.vitals.temperature}
                  onChange={(e) => handleChange("vitals.temperature", e.target.value)}
                  placeholder="°C"
                />
              </div>

              <div>
                <Label htmlFor="oxygenSaturation">Saturation O2</Label>
                <Input
                  id="oxygenSaturation"
                  type="number"
                  value={formData.vitals.oxygenSaturation}
                  onChange={(e) => handleChange("vitals.oxygenSaturation", e.target.value)}
                  placeholder="%"
                />
              </div>

              <div>
                <Label htmlFor="respiratoryRate">Fréquence respiratoire</Label>
                <Input
                  id="respiratoryRate"
                  type="number"
                  value={formData.vitals.respiratoryRate}
                  onChange={(e) => handleChange("vitals.respiratoryRate", e.target.value)}
                  placeholder="/min"
                />
              </div>

              <div>
                <Label htmlFor="painScale">Échelle de douleur</Label>
                <Input
                  id="painScale"
                  type="number"
                  min="0"
                  max="10"
                  value={formData.vitals.painScale}
                  onChange={(e) => handleChange("vitals.painScale", e.target.value)}
                  placeholder="0-10"
                />
              </div>
            </div>
          </div>

          {/* Examen physique */}
          <div>
            <Label htmlFor="physicalExamination">Examen physique</Label>
            <Textarea
              id="physicalExamination"
              value={formData.physicalExamination}
              onChange={(e) => handleChange("physicalExamination", e.target.value)}
              placeholder="Résultats de l'examen physique par systèmes..."
              rows={4}
            />
          </div>

          {/* Revue des systèmes */}
          <div>
            <Label htmlFor="reviewOfSystems">Revue des systèmes</Label>
            <Textarea
              id="reviewOfSystems"
              value={formData.reviewOfSystems}
              onChange={(e) => handleChange("reviewOfSystems", e.target.value)}
              placeholder="Revue systématique par appareils..."
              rows={3}
            />
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-6">
            <Button onClick={onBack} variant="outline" className="px-6 py-3 bg-transparent">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid}
              className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              Suivant - Questions IA
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
