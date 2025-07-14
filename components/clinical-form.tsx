"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Stethoscope, Activity } from "lucide-react"

interface VitalSigns {
  temperature: string
  bloodPressureSystolic: string
  bloodPressureDiastolic: string
  heartRate: string
}

interface ClinicalData {
  chiefComplaint: string
  symptoms: string[]
  symptomDuration: string
  symptomSeverity: string
  vitalSigns: VitalSigns
  painScale: number
  functionalStatus: string
  notes: string
}

interface ClinicalFormProps {
  data?: ClinicalData
  allData?: any
  onDataChange: (data: ClinicalData) => void
  onNext: () => void
  onPrevious: () => void
}

export default function ClinicalForm({ data, onDataChange, onNext, onPrevious }: ClinicalFormProps) {
  const [formData, setFormData] = useState<ClinicalData>({
    chiefComplaint: "",
    symptoms: [],
    symptomDuration: "",
    symptomSeverity: "",
    vitalSigns: {
      temperature: "",
      bloodPressureSystolic: "",
      bloodPressureDiastolic: "",
      heartRate: "",
    },
    painScale: 0,
    functionalStatus: "",
    notes: "",
    ...data,
  })

  const [newSymptom, setNewSymptom] = useState("")

  const commonSymptoms = [
    "Fièvre",
    "Toux",
    "Essoufflement",
    "Douleur thoracique",
    "Maux de tête",
    "Nausées",
    "Vomissements",
    "Diarrhée",
    "Constipation",
    "Fatigue",
    "Vertiges",
    "Palpitations",
    "Douleur abdominale",
    "Éruption cutanée",
    "Douleur articulaire",
    "Insomnie",
    "Perte d'appétit",
    "Perte de poids",
  ]

  const handleInputChange = (field: keyof ClinicalData, value: any) => {
    const updatedData = { ...formData, [field]: value }
    setFormData(updatedData)
    onDataChange(updatedData)
  }

  const handleVitalSignChange = (field: keyof VitalSigns, value: string) => {
    const updatedVitals = { ...formData.vitalSigns, [field]: value }
    const updatedData = { ...formData, vitalSigns: updatedVitals }
    setFormData(updatedData)
    onDataChange(updatedData)
  }

  const addSymptom = (symptom: string) => {
    if (!formData.symptoms.includes(symptom)) {
      const updatedSymptoms = [...formData.symptoms, symptom]
      const updatedData = { ...formData, symptoms: updatedSymptoms }
      setFormData(updatedData)
      onDataChange(updatedData)
    }
  }

  const removeSymptom = (symptom: string) => {
    const updatedSymptoms = formData.symptoms.filter((s) => s !== symptom)
    const updatedData = { ...formData, symptoms: updatedSymptoms }
    setFormData(updatedData)
    onDataChange(updatedData)
  }

  const addCustomSymptom = () => {
    if (newSymptom.trim() && !formData.symptoms.includes(newSymptom.trim())) {
      addSymptom(newSymptom.trim())
      setNewSymptom("")
    }
  }

  const isFormValid = () => {
    return formData.chiefComplaint.trim() && formData.symptoms.length > 0
  }

  return (
    <div className="space-y-6">
      {/* Motif de consultation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Motif de Consultation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="chiefComplaint">Motif Principal *</Label>
            <Textarea
              id="chiefComplaint"
              value={formData.chiefComplaint}
              onChange={(e) => handleInputChange("chiefComplaint", e.target.value)}
              placeholder="Décrivez le motif principal de la consultation..."
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="symptomDuration">Durée des Symptômes</Label>
              <Select
                value={formData.symptomDuration}
                onValueChange={(value) => handleInputChange("symptomDuration", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="< 24h">Moins de 24h</SelectItem>
                  <SelectItem value="1-3 jours">1-3 jours</SelectItem>
                  <SelectItem value="4-7 jours">4-7 jours</SelectItem>
                  <SelectItem value="1-2 semaines">1-2 semaines</SelectItem>
                  <SelectItem value="2-4 semaines">2-4 semaines</SelectItem>
                  <SelectItem value="> 1 mois">Plus d'1 mois</SelectItem>
                  <SelectItem value="> 3 mois">Plus de 3 mois</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="symptomSeverity">Sévérité</Label>
              <Select
                value={formData.symptomSeverity}
                onValueChange={(value) => handleInputChange("symptomSeverity", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Légère">Légère</SelectItem>
                  <SelectItem value="Modérée">Modérée</SelectItem>
                  <SelectItem value="Sévère">Sévère</SelectItem>
                  <SelectItem value="Très sévère">Très sévère</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Symptômes */}
      <Card>
        <CardHeader>
          <CardTitle>Symptômes Présents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Symptômes Courants</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
              {commonSymptoms.map((symptom) => (
                <Button
                  key={symptom}
                  variant={formData.symptoms.includes(symptom) ? "default" : "outline"}
                  size="sm"
                  onClick={() => (formData.symptoms.includes(symptom) ? removeSymptom(symptom) : addSymptom(symptom))}
                  className="justify-start"
                >
                  {symptom}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <Label>Ajouter un Symptôme Personnalisé</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={newSymptom}
                onChange={(e) => setNewSymptom(e.target.value)}
                placeholder="Nouveau symptôme"
                onKeyPress={(e) => e.key === "Enter" && addCustomSymptom()}
              />
              <Button onClick={addCustomSymptom} variant="outline">
                Ajouter
              </Button>
            </div>
          </div>

          {formData.symptoms.length > 0 && (
            <div>
              <Label>Symptômes Sélectionnés</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.symptoms.map((symptom, index) => (
                  <Badge
                    key={index}
                    variant="default"
                    className="cursor-pointer"
                    onClick={() => removeSymptom(symptom)}
                  >
                    {symptom}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signes vitaux */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Signes Vitaux
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="temperature">Température (°C)</Label>
              <Input
                id="temperature"
                type="number"
                step="0.1"
                value={formData.vitalSigns.temperature}
                onChange={(e) => handleVitalSignChange("temperature", e.target.value)}
                placeholder="37.0"
              />
            </div>
            <div>
              <Label htmlFor="heartRate">Fréquence Cardiaque</Label>
              <Input
                id="heartRate"
                type="number"
                value={formData.vitalSigns.heartRate}
                onChange={(e) => handleVitalSignChange("heartRate", e.target.value)}
                placeholder="80"
              />
            </div>
            <div>
              <Label htmlFor="bloodPressureSystolic">TA Systolique</Label>
              <Input
                id="bloodPressureSystolic"
                type="number"
                value={formData.vitalSigns.bloodPressureSystolic}
                onChange={(e) => handleVitalSignChange("bloodPressureSystolic", e.target.value)}
                placeholder="120"
              />
            </div>
            <div>
              <Label htmlFor="bloodPressureDiastolic">TA Diastolique</Label>
              <Input
                id="bloodPressureDiastolic"
                type="number"
                value={formData.vitalSigns.bloodPressureDiastolic}
                onChange={(e) => handleVitalSignChange("bloodPressureDiastolic", e.target.value)}
                placeholder="80"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Échelle de douleur */}
      <Card>
        <CardHeader>
          <CardTitle>Évaluation de la Douleur</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label>Échelle de Douleur (0-10)</Label>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-sm text-gray-600">0 (Aucune)</span>
              <div className="flex gap-1">
                {[...Array(11)].map((_, i) => (
                  <Button
                    key={i}
                    variant={formData.painScale === i ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleInputChange("painScale", i)}
                    className="w-8 h-8 p-0"
                  >
                    {i}
                  </Button>
                ))}
              </div>
              <span className="text-sm text-gray-600">10 (Maximale)</span>
            </div>
            {formData.painScale > 0 && (
              <div className="mt-2 text-sm text-gray-600">
                Douleur sélectionnée: {formData.painScale}/10 -{" "}
                {formData.painScale <= 3
                  ? "Légère"
                  : formData.painScale > 3 && formData.painScale <= 6
                    ? "Modérée"
                    : formData.painScale > 6 && formData.painScale <= 8
                      ? "Sévère"
                      : "Très sévère"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statut fonctionnel */}
      <Card>
        <CardHeader>
          <CardTitle>Statut Fonctionnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="functionalStatus">Capacité Fonctionnelle</Label>
            <Select
              value={formData.functionalStatus}
              onValueChange={(value) => handleInputChange("functionalStatus", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner le niveau d'autonomie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Autonome">Complètement autonome</SelectItem>
                <SelectItem value="Aide légère">Aide légère nécessaire</SelectItem>
                <SelectItem value="Aide modérée">Aide modérée nécessaire</SelectItem>
                <SelectItem value="Aide importante">Aide importante nécessaire</SelectItem>
                <SelectItem value="Dépendant">Complètement dépendant</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notes cliniques */}
      <Card>
        <CardHeader>
          <CardTitle>Notes Cliniques</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            placeholder="Observations cliniques supplémentaires..."
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          Retour aux Informations Patient
        </Button>
        <Button onClick={onNext} disabled={!isFormValid()}>
          Continuer vers les Questions IA
        </Button>
      </div>
    </div>
  )
}
