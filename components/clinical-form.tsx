"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Stethoscope, Activity, AlertTriangle, ArrowLeft, Brain } from "lucide-react"

interface ClinicalFormProps {
  initialData: any
  onDataChange: (data: any) => void
  onNext: () => void
  onBack: () => void
  isValid: boolean
  isLoading: boolean
  error: string | null
  apiStatus: any
}

export default function ClinicalForm({
  initialData,
  onDataChange,
  onNext,
  onBack,
  isValid,
  isLoading,
  error,
  apiStatus,
}: ClinicalFormProps) {
  const [formData, setFormData] = useState(initialData)
  const [errors, setErrors] = useState({})

  const handleChange = useCallback(
    (field: string, value: string) => {
      const newData = { ...formData, [field]: value }
      setFormData(newData)
      onDataChange(newData)

      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: null }))
      }
    },
    [formData, onDataChange, errors],
  )

  const handleVitalChange = useCallback(
    (vital: string, value: string) => {
      const newVitals = { ...formData.vitals, [vital]: value }
      const newData = { ...formData, vitals: newVitals }
      setFormData(newData)
      onDataChange(newData)
    },
    [formData, onDataChange],
  )

  const validateForm = () => {
    const newErrors = {}
    if (!formData.chiefComplaint?.trim()) newErrors.chiefComplaint = "Motif de consultation requis"
    if (!formData.symptoms?.trim()) newErrors.symptoms = "Description des symptômes requise"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onNext()
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center mb-6">
        <Stethoscope className="h-8 w-8 text-green-600 mr-3" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Présentation Clinique</h2>
          <p className="text-gray-600">Collecte des données symptomatiques et cliniques</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Motif de consultation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Stethoscope className="h-5 w-5 mr-2" />
              Motif de Consultation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="chiefComplaint">Motif Principal *</Label>
              <Textarea
                id="chiefComplaint"
                value={formData.chiefComplaint || ""}
                onChange={(e) => handleChange("chiefComplaint", e.target.value)}
                placeholder="Ex: Douleur thoracique, fièvre, dyspnée..."
                rows={3}
                className={errors.chiefComplaint ? "border-red-500" : ""}
              />
              {errors.chiefComplaint && <p className="text-red-500 text-sm mt-1">{errors.chiefComplaint}</p>}
            </div>

            <div>
              <Label htmlFor="symptoms">Description Détaillée des Symptômes *</Label>
              <Textarea
                id="symptoms"
                value={formData.symptoms || ""}
                onChange={(e) => handleChange("symptoms", e.target.value)}
                placeholder="Décrivez en détail les symptômes, leur évolution, facteurs déclenchants..."
                rows={6}
                className={errors.symptoms ? "border-red-500" : ""}
              />
              {errors.symptoms && <p className="text-red-500 text-sm mt-1">{errors.symptoms}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Durée des Symptômes</Label>
                <Select value={formData.duration || ""} onValueChange={(value) => handleChange("duration", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="< 1 heure">Moins d'1 heure</SelectItem>
                    <SelectItem value="1-6 heures">1-6 heures</SelectItem>
                    <SelectItem value="6-24 heures">6-24 heures</SelectItem>
                    <SelectItem value="1-3 jours">1-3 jours</SelectItem>
                    <SelectItem value="3-7 jours">3-7 jours</SelectItem>
                    <SelectItem value="1-4 semaines">1-4 semaines</SelectItem>
                    <SelectItem value="> 1 mois">Plus d'1 mois</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="severity">Sévérité</Label>
                <Select value={formData.severity || ""} onValueChange={(value) => handleChange("severity", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Évaluer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Légère">Légère (1-3/10)</SelectItem>
                    <SelectItem value="Modérée">Modérée (4-6/10)</SelectItem>
                    <SelectItem value="Sévère">Sévère (7-8/10)</SelectItem>
                    <SelectItem value="Très sévère">Très sévère (9-10/10)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Signes vitaux */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Signes Vitaux
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bp">Tension Artérielle</Label>
                <Input
                  id="bp"
                  value={formData.vitals?.bp || ""}
                  onChange={(e) => handleVitalChange("bp", e.target.value)}
                  placeholder="Ex: 120/80"
                />
              </div>

              <div>
                <Label htmlFor="hr">Fréquence Cardiaque</Label>
                <Input
                  id="hr"
                  value={formData.vitals?.hr || ""}
                  onChange={(e) => handleVitalChange("hr", e.target.value)}
                  placeholder="Ex: 72 bpm"
                />
              </div>

              <div>
                <Label htmlFor="temp">Température</Label>
                <Input
                  id="temp"
                  value={formData.vitals?.temp || ""}
                  onChange={(e) => handleVitalChange("temp", e.target.value)}
                  placeholder="Ex: 37.2°C"
                />
              </div>

              <div>
                <Label htmlFor="spo2">SpO2</Label>
                <Input
                  id="spo2"
                  value={formData.vitals?.spo2 || ""}
                  onChange={(e) => handleVitalChange("spo2", e.target.value)}
                  placeholder="Ex: 98%"
                />
              </div>

              <div>
                <Label htmlFor="rr">Fréquence Respiratoire</Label>
                <Input
                  id="rr"
                  value={formData.vitals?.rr || ""}
                  onChange={(e) => handleVitalChange("rr", e.target.value)}
                  placeholder="Ex: 16/min"
                />
              </div>

              <div>
                <Label htmlFor="pain">Échelle Douleur</Label>
                <Select value={formData.vitals?.pain || ""} onValueChange={(value) => handleVitalChange("pain", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="/10" />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <SelectItem key={num} value={num.toString()}>
                        {num}/10
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Alerte signes vitaux anormaux */}
            {formData.vitals?.temp && Number.parseFloat(formData.vitals.temp) > 38.5 && (
              <div className="bg-red-50 border border-red-200 p-3 rounded flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                <span className="text-red-700 font-medium">Hyperthermie détectée</span>
              </div>
            )}

            {formData.vitals?.pain && Number.parseInt(formData.vitals.pain) >= 7 && (
              <div className="bg-orange-50 border border-orange-200 p-3 rounded flex items-center">
                <AlertTriangle className="h-5 w-5 text-orange-600 mr-2" />
                <span className="text-orange-700 font-medium">Douleur sévère signalée</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Examen physique */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Examen Physique
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="physicalExam">Examen Clinique</Label>
            <Textarea
              id="physicalExam"
              value={formData.physicalExam || ""}
              onChange={(e) => handleChange("physicalExam", e.target.value)}
              placeholder="Inspection, palpation, percussion, auscultation par système..."
              rows={6}
            />
          </div>
        </CardContent>
      </Card>

      {/* Status API et erreurs */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <span className="font-semibold text-red-800">Erreur</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Status APIs */}
      <div className="mt-4 bg-gray-50 border border-gray-200 p-4 rounded-lg">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-gray-700">Status des APIs Médicales</span>
          <div className="flex space-x-4">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${apiStatus.openai ? "bg-green-500" : "bg-red-500"}`}></div>
              <span className="text-sm">OpenAI</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${apiStatus.fda ? "bg-green-500" : "bg-red-500"}`}></div>
              <span className="text-sm">FDA</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${apiStatus.rxnorm ? "bg-green-500" : "bg-red-500"}`}></div>
              <span className="text-sm">RxNorm</span>
            </div>
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${apiStatus.pubmed ? "bg-green-500" : "bg-red-500"}`}></div>
              <span className="text-sm">PubMed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-8">
        <Button onClick={onBack} variant="outline" className="flex items-center bg-transparent">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour Patient
        </Button>

        <Button
          onClick={handleSubmit}
          disabled={!isValid || isLoading}
          className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Génération Questions IA...
            </>
          ) : (
            <>
              <Brain className="h-5 w-5 mr-2" />
              Générer Questions IA →
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
