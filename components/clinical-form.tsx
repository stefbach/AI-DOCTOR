"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, ArrowRight, Stethoscope, Thermometer, Heart, Activity } from "lucide-react"

interface ClinicalData {
  chiefComplaint: string
  symptoms: string[]
  symptomDuration: string
  vitalSigns: {
    temperature: string
    heartRate: string
    bloodPressureSystolic: string
    bloodPressureDiastolic: string
  }
  painScale: number
  functionalStatus: string
  notes: string
}

interface ClinicalFormProps {
  data?: ClinicalData
  patientData?: any
  onDataChange: (data: ClinicalData) => void
  onNext: () => void
  onPrevious: () => void
}

const commonSymptoms = [
  "Douleur thoracique",
  "Essoufflement",
  "Palpitations",
  "Fatigue",
  "Nausées",
  "Vomissements",
  "Diarrhée",
  "Constipation",
  "Maux de tête",
  "Vertiges",
  "Fièvre",
  "Frissons",
  "Toux",
  "Douleur abdominale",
  "Douleur dorsale",
  "Insomnie",
  "Anxiété",
  "Perte d'appétit",
  "Perte de poids",
  "Gonflement des jambes",
]

const defaultClinicalData: ClinicalData = {
  chiefComplaint: "",
  symptoms: [],
  symptomDuration: "",
  vitalSigns: {
    temperature: "",
    heartRate: "",
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
  },
  painScale: 0,
  functionalStatus: "",
  notes: "",
}

export default function ClinicalForm({ data, patientData, onDataChange, onNext, onPrevious }: ClinicalFormProps) {
  const [localData, setLocalData] = useState<ClinicalData>(defaultClinicalData)

  useEffect(() => {
    if (data) {
      setLocalData({
        chiefComplaint: data.chiefComplaint || "",
        symptoms: Array.isArray(data.symptoms) ? data.symptoms : [],
        symptomDuration: data.symptomDuration || "",
        vitalSigns: {
          temperature: data.vitalSigns?.temperature || "",
          heartRate: data.vitalSigns?.heartRate || "",
          bloodPressureSystolic: data.vitalSigns?.bloodPressureSystolic || "",
          bloodPressureDiastolic: data.vitalSigns?.bloodPressureDiastolic || "",
        },
        painScale: typeof data.painScale === "number" ? data.painScale : 0,
        functionalStatus: data.functionalStatus || "",
        notes: data.notes || "",
      })
    }
  }, [data])

  const updateData = (updates: Partial<ClinicalData>) => {
    const newData = { ...localData, ...updates }
    setLocalData(newData)
    onDataChange(newData)
  }

  const updateVitalSigns = (field: string, value: string) => {
    const newVitalSigns = { ...localData.vitalSigns, [field]: value }
    updateData({ vitalSigns: newVitalSigns })
  }

  const toggleSymptom = (symptom: string) => {
    const currentSymptoms = Array.isArray(localData.symptoms) ? localData.symptoms : []
    const newSymptoms = currentSymptoms.includes(symptom)
      ? currentSymptoms.filter((s) => s !== symptom)
      : [...currentSymptoms, symptom]
    updateData({ symptoms: newSymptoms })
  }

  const isFormValid = () => {
    const chiefComplaint = localData.chiefComplaint || ""
    const symptoms = Array.isArray(localData.symptoms) ? localData.symptoms : []
    const symptomDuration = localData.symptomDuration || ""

    return chiefComplaint.trim() !== "" && symptoms.length > 0 && symptomDuration !== ""
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Examen Clinique
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Motif de consultation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Motif de Consultation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="chiefComplaint">Motif principal de consultation *</Label>
            <Textarea
              id="chiefComplaint"
              value={localData.chiefComplaint || ""}
              onChange={(e) => updateData({ chiefComplaint: e.target.value })}
              placeholder="Décrivez le motif principal de la consultation..."
              rows={3}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Symptômes présents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Symptômes Présents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Sélectionnez tous les symptômes présents *</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
              {commonSymptoms.map((symptom) => {
                const currentSymptoms = Array.isArray(localData.symptoms) ? localData.symptoms : []
                return (
                  <div key={symptom} className="flex items-center space-x-2">
                    <Checkbox
                      id={symptom}
                      checked={currentSymptoms.includes(symptom)}
                      onCheckedChange={() => toggleSymptom(symptom)}
                    />
                    <Label htmlFor={symptom} className="text-sm cursor-pointer">
                      {symptom}
                    </Label>
                  </div>
                )
              })}
            </div>
          </div>

          {Array.isArray(localData.symptoms) && localData.symptoms.length > 0 && (
            <div>
              <Label>Symptômes sélectionnés :</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {localData.symptoms.map((symptom) => (
                  <Badge key={symptom} variant="secondary">
                    {symptom}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="symptomDuration">Durée des symptômes *</Label>
            <Select
              value={localData.symptomDuration || ""}
              onValueChange={(value) => updateData({ symptomDuration: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionnez la durée" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Moins d'1 heure">Moins d'1 heure</SelectItem>
                <SelectItem value="1-6 heures">1-6 heures</SelectItem>
                <SelectItem value="6-24 heures">6-24 heures</SelectItem>
                <SelectItem value="1-3 jours">1-3 jours</SelectItem>
                <SelectItem value="3-7 jours">3-7 jours</SelectItem>
                <SelectItem value="1-4 semaines">1-4 semaines</SelectItem>
                <SelectItem value="1-6 mois">1-6 mois</SelectItem>
                <SelectItem value="Plus de 6 mois">Plus de 6 mois</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Signes vitaux */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Signes Vitaux
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Thermometer className="h-4 w-4 text-red-500" />
              <div className="flex-1">
                <Label htmlFor="temperature">Température (°C)</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  value={localData.vitalSigns?.temperature || ""}
                  onChange={(e) => updateVitalSigns("temperature", e.target.value)}
                  placeholder="37.0"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Heart className="h-4 w-4 text-red-500" />
              <div className="flex-1">
                <Label htmlFor="heartRate">Fréquence cardiaque (bpm)</Label>
                <Input
                  id="heartRate"
                  type="number"
                  value={localData.vitalSigns?.heartRate || ""}
                  onChange={(e) => updateVitalSigns("heartRate", e.target.value)}
                  placeholder="80"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bloodPressureSystolic">Tension artérielle systolique (mmHg)</Label>
              <Input
                id="bloodPressureSystolic"
                type="number"
                value={localData.vitalSigns?.bloodPressureSystolic || ""}
                onChange={(e) => updateVitalSigns("bloodPressureSystolic", e.target.value)}
                placeholder="120"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="bloodPressureDiastolic">Tension artérielle diastolique (mmHg)</Label>
              <Input
                id="bloodPressureDiastolic"
                type="number"
                value={localData.vitalSigns?.bloodPressureDiastolic || ""}
                onChange={(e) => updateVitalSigns("bloodPressureDiastolic", e.target.value)}
                placeholder="80"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Évaluation de la douleur */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Évaluation de la Douleur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Échelle de douleur (0 = aucune douleur, 10 = douleur maximale)</Label>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-sm">0</span>
              <div className="flex space-x-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                  <Button
                    key={value}
                    variant={(localData.painScale || 0) === value ? "default" : "outline"}
                    size="sm"
                    onClick={() => updateData({ painScale: value })}
                    className="w-8 h-8 p-0"
                  >
                    {value}
                  </Button>
                ))}
              </div>
              <span className="text-sm">10</span>
            </div>
            {(localData.painScale || 0) > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                Douleur sélectionnée : {localData.painScale}/10
                {(localData.painScale || 0) <= 3 && " (Légère)"}
                {(localData.painScale || 0) > 3 && (localData.painScale || 0) <= 6 && " (Modérée)"}
                {(localData.painScale || 0) > 6 && (localData.painScale || 0) <= 8 && " (Sévère)"}
                {(localData.painScale || 0) > 8 && " (Très sévère)"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statut fonctionnel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Statut Fonctionnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="functionalStatus">Impact sur les activités quotidiennes</Label>
            <Select
              value={localData.functionalStatus || ""}
              onValueChange={(value) => updateData({ functionalStatus: value })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Sélectionnez l'impact fonctionnel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Aucun impact">Aucun impact</SelectItem>
                <SelectItem value="Impact léger">Impact léger</SelectItem>
                <SelectItem value="Impact modéré">Impact modéré</SelectItem>
                <SelectItem value="Impact important">Impact important</SelectItem>
                <SelectItem value="Incapacité complète">Incapacité complète</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notes cliniques */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notes Cliniques</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="notes">Observations et notes supplémentaires</Label>
            <Textarea
              id="notes"
              value={localData.notes || ""}
              onChange={(e) => updateData({ notes: e.target.value })}
              placeholder="Ajoutez toute observation clinique pertinente..."
              rows={4}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux Informations Patient
        </Button>
        <Button onClick={onNext} disabled={!isFormValid()}>
          Continuer vers les Questions IA
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
