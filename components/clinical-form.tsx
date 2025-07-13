"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Stethoscope, ArrowLeft, ArrowRight, Plus, X, Heart, Thermometer, Activity, Droplets } from "lucide-react"

interface ClinicalFormProps {
  data?: any
  allData?: any
  onDataChange: (data: any) => void
  onNext: () => void
  onPrevious: () => void
}

export default function ClinicalForm({ data = {}, allData, onDataChange, onNext, onPrevious }: ClinicalFormProps) {
  const [formData, setFormData] = useState({
    chiefComplaint: data.chiefComplaint || "",
    historyOfPresentIllness: data.historyOfPresentIllness || "",
    symptoms: data.symptoms || [],
    vitalSigns: {
      bloodPressure: data.vitalSigns?.bloodPressure || "",
      heartRate: data.vitalSigns?.heartRate || "",
      temperature: data.vitalSigns?.temperature || "",
      respiratoryRate: data.vitalSigns?.respiratoryRate || "",
      oxygenSaturation: data.vitalSigns?.oxygenSaturation || "",
      weight: data.vitalSigns?.weight || "",
      height: data.vitalSigns?.height || "",
      bmi: data.vitalSigns?.bmi || "",
    },
    physicalExam: {
      general: data.physicalExam?.general || "",
      cardiovascular: data.physicalExam?.cardiovascular || "",
      respiratory: data.physicalExam?.respiratory || "",
      abdominal: data.physicalExam?.abdominal || "",
      neurological: data.physicalExam?.neurological || "",
      musculoskeletal: data.physicalExam?.musculoskeletal || "",
      skin: data.physicalExam?.skin || "",
      other: data.physicalExam?.other || "",
    },
    reviewOfSystems: data.reviewOfSystems || "",
    clinicalImpression: data.clinicalImpression || "",
  })

  const [newSymptom, setNewSymptom] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: any) => {
    if (field.includes(".")) {
      const [parent, child] = field.split(".")
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent as keyof typeof prev],
          [child]: value,
        },
      }))
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }))
    }

    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const calculateBMI = (weight: string, height: string) => {
    if (!weight || !height) return ""
    const weightNum = Number.parseFloat(weight)
    const heightNum = Number.parseFloat(height) / 100 // Convert cm to m
    if (weightNum > 0 && heightNum > 0) {
      const bmi = weightNum / (heightNum * heightNum)
      return bmi.toFixed(1)
    }
    return ""
  }

  const handleWeightChange = (value: string) => {
    handleInputChange("vitalSigns.weight", value)
    const bmi = calculateBMI(value, formData.vitalSigns.height)
    handleInputChange("vitalSigns.bmi", bmi)
  }

  const handleHeightChange = (value: string) => {
    handleInputChange("vitalSigns.height", value)
    const bmi = calculateBMI(formData.vitalSigns.weight, value)
    handleInputChange("vitalSigns.bmi", bmi)
  }

  const addSymptom = () => {
    if (newSymptom.trim() && !formData.symptoms.includes(newSymptom.trim())) {
      const updatedSymptoms = [...formData.symptoms, newSymptom.trim()]
      setFormData((prev) => ({ ...prev, symptoms: updatedSymptoms }))
      setNewSymptom("")
    }
  }

  const removeSymptom = (symptom: string) => {
    const updatedSymptoms = formData.symptoms.filter((s) => s !== symptom)
    setFormData((prev) => ({ ...prev, symptoms: updatedSymptoms }))
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.chiefComplaint.trim()) {
      newErrors.chiefComplaint = "Le motif de consultation est requis"
    }

    if (!formData.vitalSigns.bloodPressure.trim()) {
      newErrors["vitalSigns.bloodPressure"] = "La tension artérielle est requise"
    }

    if (!formData.vitalSigns.heartRate.trim()) {
      newErrors["vitalSigns.heartRate"] = "La fréquence cardiaque est requise"
    }

    if (!formData.vitalSigns.temperature.trim()) {
      newErrors["vitalSigns.temperature"] = "La température est requise"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onDataChange(formData)
      onNext()
    }
  }

  const getBMICategory = (bmi: string) => {
    const bmiNum = Number.parseFloat(bmi)
    if (bmiNum < 18.5) return { category: "Insuffisance pondérale", color: "text-blue-600" }
    if (bmiNum < 25) return { category: "Poids normal", color: "text-green-600" }
    if (bmiNum < 30) return { category: "Surpoids", color: "text-orange-600" }
    return { category: "Obésité", color: "text-red-600" }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Stethoscope className="h-6 w-6 mr-3 text-green-600" />
            Examen Clinique
          </CardTitle>
          <p className="text-gray-600">
            Examen clinique de {allData?.patientData?.firstName} {allData?.patientData?.lastName}
            {allData?.patientData?.age && ` (${allData.patientData.age} ans)`}
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Motif de consultation */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Motif de consultation</h3>
            <div className="space-y-2">
              <Label htmlFor="chiefComplaint">Motif principal *</Label>
              <Textarea
                id="chiefComplaint"
                value={formData.chiefComplaint}
                onChange={(e) => handleInputChange("chiefComplaint", e.target.value)}
                placeholder="Décrivez le motif principal de la consultation..."
                rows={3}
                className={errors.chiefComplaint ? "border-red-500" : ""}
              />
              {errors.chiefComplaint && <p className="text-red-500 text-sm">{errors.chiefComplaint}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="historyOfPresentIllness">Histoire de la maladie actuelle</Label>
              <Textarea
                id="historyOfPresentIllness"
                value={formData.historyOfPresentIllness}
                onChange={(e) => handleInputChange("historyOfPresentIllness", e.target.value)}
                placeholder="Évolution des symptômes, chronologie, facteurs déclenchants..."
                rows={4}
              />
            </div>
          </div>

          {/* Symptômes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Symptômes associés</h3>

            <div className="flex gap-2">
              <Input
                value={newSymptom}
                onChange={(e) => setNewSymptom(e.target.value)}
                placeholder="Ajouter un symptôme..."
                onKeyPress={(e) => e.key === "Enter" && addSymptom()}
              />
              <Button onClick={addSymptom} variant="outline" size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {formData.symptoms.map((symptom, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {symptom}
                  <button onClick={() => removeSymptom(symptom)} className="ml-1 hover:text-red-600">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          {/* Signes vitaux */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-red-600" />
              Signes vitaux
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="bloodPressure" className="flex items-center">
                  <Heart className="h-4 w-4 mr-1 text-red-500" />
                  Tension artérielle *
                </Label>
                <Input
                  id="bloodPressure"
                  value={formData.vitalSigns.bloodPressure}
                  onChange={(e) => handleInputChange("vitalSigns.bloodPressure", e.target.value)}
                  placeholder="120/80 mmHg"
                  className={errors["vitalSigns.bloodPressure"] ? "border-red-500" : ""}
                />
                {errors["vitalSigns.bloodPressure"] && (
                  <p className="text-red-500 text-sm">{errors["vitalSigns.bloodPressure"]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="heartRate" className="flex items-center">
                  <Activity className="h-4 w-4 mr-1 text-green-500" />
                  Fréquence cardiaque *
                </Label>
                <Input
                  id="heartRate"
                  value={formData.vitalSigns.heartRate}
                  onChange={(e) => handleInputChange("vitalSigns.heartRate", e.target.value)}
                  placeholder="72 bpm"
                  className={errors["vitalSigns.heartRate"] ? "border-red-500" : ""}
                />
                {errors["vitalSigns.heartRate"] && (
                  <p className="text-red-500 text-sm">{errors["vitalSigns.heartRate"]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature" className="flex items-center">
                  <Thermometer className="h-4 w-4 mr-1 text-orange-500" />
                  Température *
                </Label>
                <Input
                  id="temperature"
                  value={formData.vitalSigns.temperature}
                  onChange={(e) => handleInputChange("vitalSigns.temperature", e.target.value)}
                  placeholder="37.0°C"
                  className={errors["vitalSigns.temperature"] ? "border-red-500" : ""}
                />
                {errors["vitalSigns.temperature"] && (
                  <p className="text-red-500 text-sm">{errors["vitalSigns.temperature"]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="respiratoryRate">Fréquence respiratoire</Label>
                <Input
                  id="respiratoryRate"
                  value={formData.vitalSigns.respiratoryRate}
                  onChange={(e) => handleInputChange("vitalSigns.respiratoryRate", e.target.value)}
                  placeholder="16 /min"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="oxygenSaturation" className="flex items-center">
                  <Droplets className="h-4 w-4 mr-1 text-blue-500" />
                  SpO2
                </Label>
                <Input
                  id="oxygenSaturation"
                  value={formData.vitalSigns.oxygenSaturation}
                  onChange={(e) => handleInputChange("vitalSigns.oxygenSaturation", e.target.value)}
                  placeholder="98%"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Poids (kg)</Label>
                <Input
                  id="weight"
                  value={formData.vitalSigns.weight}
                  onChange={(e) => handleWeightChange(e.target.value)}
                  placeholder="70"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="height">Taille (cm)</Label>
                <Input
                  id="height"
                  value={formData.vitalSigns.height}
                  onChange={(e) => handleHeightChange(e.target.value)}
                  placeholder="175"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bmi">IMC</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="bmi"
                    value={formData.vitalSigns.bmi}
                    readOnly
                    placeholder="Calculé"
                    className="bg-gray-50"
                  />
                  {formData.vitalSigns.bmi && (
                    <Badge variant="outline" className={getBMICategory(formData.vitalSigns.bmi).color}>
                      {getBMICategory(formData.vitalSigns.bmi).category}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Examen physique */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Examen physique</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="general">État général</Label>
                <Textarea
                  id="general"
                  value={formData.physicalExam.general}
                  onChange={(e) => handleInputChange("physicalExam.general", e.target.value)}
                  placeholder="Aspect général, état de conscience, coopération..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cardiovascular">Cardiovasculaire</Label>
                <Textarea
                  id="cardiovascular"
                  value={formData.physicalExam.cardiovascular}
                  onChange={(e) => handleInputChange("physicalExam.cardiovascular", e.target.value)}
                  placeholder="Auscultation cardiaque, pouls, œdèmes..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="respiratory">Respiratoire</Label>
                <Textarea
                  id="respiratory"
                  value={formData.physicalExam.respiratory}
                  onChange={(e) => handleInputChange("physicalExam.respiratory", e.target.value)}
                  placeholder="Auscultation pulmonaire, dyspnée..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="abdominal">Abdominal</Label>
                <Textarea
                  id="abdominal"
                  value={formData.physicalExam.abdominal}
                  onChange={(e) => handleInputChange("physicalExam.abdominal", e.target.value)}
                  placeholder="Palpation, auscultation, défense..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="neurological">Neurologique</Label>
                <Textarea
                  id="neurological"
                  value={formData.physicalExam.neurological}
                  onChange={(e) => handleInputChange("physicalExam.neurological", e.target.value)}
                  placeholder="Réflexes, force, sensibilité..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="musculoskeletal">Musculo-squelettique</Label>
                <Textarea
                  id="musculoskeletal"
                  value={formData.physicalExam.musculoskeletal}
                  onChange={(e) => handleInputChange("physicalExam.musculoskeletal", e.target.value)}
                  placeholder="Mobilité, déformations, douleurs..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skin">Peau et phanères</Label>
                <Textarea
                  id="skin"
                  value={formData.physicalExam.skin}
                  onChange={(e) => handleInputChange("physicalExam.skin", e.target.value)}
                  placeholder="Lésions cutanées, coloration..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="other">Autres systèmes</Label>
                <Textarea
                  id="other"
                  value={formData.physicalExam.other}
                  onChange={(e) => handleInputChange("physicalExam.other", e.target.value)}
                  placeholder="ORL, ophtalmologique, gynécologique..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Revue des systèmes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Revue des systèmes</h3>
            <div className="space-y-2">
              <Label htmlFor="reviewOfSystems">Symptômes par système</Label>
              <Textarea
                id="reviewOfSystems"
                value={formData.reviewOfSystems}
                onChange={(e) => handleInputChange("reviewOfSystems", e.target.value)}
                placeholder="Revue systématique des symptômes par appareil..."
                rows={4}
              />
            </div>
          </div>

          {/* Impression clinique */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Impression clinique préliminaire</h3>
            <div className="space-y-2">
              <Label htmlFor="clinicalImpression">Impression du clinicien</Label>
              <Textarea
                id="clinicalImpression"
                value={formData.clinicalImpression}
                onChange={(e) => handleInputChange("clinicalImpression", e.target.value)}
                placeholder="Première impression diagnostique, hypothèses..."
                rows={3}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-6 border-t">
            <Button onClick={onPrevious} variant="outline" className="px-6 py-3 bg-transparent">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Retour Patient
            </Button>
            <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 px-8 py-3">
              Continuer vers les Questions IA
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
