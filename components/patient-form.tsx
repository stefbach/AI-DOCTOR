"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { User, Heart, Shield, Calendar } from "lucide-react"

interface PatientFormProps {
  initialData: any
  onDataChange: (data: any) => void
  onNext: () => void
  isValid: boolean
}

export default function PatientForm({ initialData, onDataChange, onNext, isValid }: PatientFormProps) {
  const [formData, setFormData] = useState(initialData)
  const [errors, setErrors] = useState({})

  const handleChange = useCallback(
    (field: string, value: string) => {
      const newData = { ...formData, [field]: value }
      setFormData(newData)
      onDataChange(newData)

      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: null }))
      }
    },
    [formData, onDataChange, errors],
  )

  const validateForm = () => {
    const newErrors = {}
    if (!formData.name?.trim()) newErrors.name = "Nom requis"
    if (!formData.age || formData.age <= 0) newErrors.age = "Âge valide requis"
    if (!formData.gender) newErrors.gender = "Genre requis"
    if (!formData.weight || formData.weight <= 0) newErrors.weight = "Poids valide requis"
    if (!formData.height || formData.height <= 0) newErrors.height = "Taille valide requise"

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
        <User className="h-8 w-8 text-blue-600 mr-3" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Informations Patient</h2>
          <p className="text-gray-600">Collecte des données démographiques et médicales</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Informations démographiques */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Informations Personnelles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Nom complet *</Label>
              <Input
                id="name"
                value={formData.name || ""}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Nom Prénom"
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="age">Âge *</Label>
                <Input
                  id="age"
                  type="number"
                  value={formData.age || ""}
                  onChange={(e) => handleChange("age", e.target.value)}
                  placeholder="Ex: 45"
                  className={errors.age ? "border-red-500" : ""}
                />
                {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age}</p>}
              </div>

              <div>
                <Label htmlFor="gender">Genre *</Label>
                <Select value={formData.gender || ""} onValueChange={(value) => handleChange("gender", value)}>
                  <SelectTrigger className={errors.gender ? "border-red-500" : ""}>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculin</SelectItem>
                    <SelectItem value="F">Féminin</SelectItem>
                    <SelectItem value="Autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-red-500 text-sm mt-1">{errors.gender}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weight">Poids (kg) *</Label>
                <Input
                  id="weight"
                  type="number"
                  value={formData.weight || ""}
                  onChange={(e) => handleChange("weight", e.target.value)}
                  placeholder="Ex: 70"
                  className={errors.weight ? "border-red-500" : ""}
                />
                {errors.weight && <p className="text-red-500 text-sm mt-1">{errors.weight}</p>}
              </div>

              <div>
                <Label htmlFor="height">Taille (cm) *</Label>
                <Input
                  id="height"
                  type="number"
                  value={formData.height || ""}
                  onChange={(e) => handleChange("height", e.target.value)}
                  placeholder="Ex: 175"
                  className={errors.height ? "border-red-500" : ""}
                />
                {errors.height && <p className="text-red-500 text-sm mt-1">{errors.height}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="insurance">Assurance Médicale</Label>
              <Input
                id="insurance"
                value={formData.insurance || ""}
                onChange={(e) => handleChange("insurance", e.target.value)}
                placeholder="Ex: CNAM, Privée"
              />
            </div>

            <div>
              <Label htmlFor="emergencyContact">Contact d'Urgence</Label>
              <Input
                id="emergencyContact"
                value={formData.emergencyContact || ""}
                onChange={(e) => handleChange("emergencyContact", e.target.value)}
                placeholder="Nom et téléphone"
              />
            </div>
          </CardContent>
        </Card>

        {/* Antécédents médicaux */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Heart className="h-5 w-5 mr-2" />
              Antécédents Médicaux
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="medicalHistory">Antécédents Médicaux</Label>
              <Textarea
                id="medicalHistory"
                value={formData.medicalHistory || ""}
                onChange={(e) => handleChange("medicalHistory", e.target.value)}
                placeholder="Maladies chroniques, chirurgies passées, hospitalisations..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="currentMedications">Médicaments Actuels</Label>
              <Textarea
                id="currentMedications"
                value={formData.currentMedications || ""}
                onChange={(e) => handleChange("currentMedications", e.target.value)}
                placeholder="Liste des médicaments avec posologie..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="allergies">Allergies Connues</Label>
              <Textarea
                id="allergies"
                value={formData.allergies || ""}
                onChange={(e) => handleChange("allergies", e.target.value)}
                placeholder="Médicaments, aliments, substances..."
                rows={2}
                className="border-red-200 focus:border-red-400"
              />
              {formData.allergies && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded flex items-center">
                  <Shield className="h-4 w-4 text-red-600 mr-2" />
                  <span className="text-red-700 text-sm font-medium">Allergies déclarées</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Résumé du patient */}
      {formData.name && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Résumé Patient
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-semibold">Patient:</span>
                  <p>{formData.name}</p>
                </div>
                <div>
                  <span className="font-semibold">Âge/Genre:</span>
                  <p>
                    {formData.age} ans, {formData.gender}
                  </p>
                </div>
                <div>
                  <span className="font-semibold">Morphologie:</span>
                  <p>
                    {formData.weight}kg, {formData.height}cm
                  </p>
                </div>
                <div>
                  <span className="font-semibold">IMC:</span>
                  <p>
                    {formData.weight && formData.height
                      ? (formData.weight / (formData.height / 100) ** 2).toFixed(1)
                      : "N/A"}
                  </p>
                </div>
              </div>
              {formData.allergies && (
                <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded">
                  <span className="font-semibold text-red-800">⚠️ Allergies: </span>
                  <span className="text-red-700">{formData.allergies}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-end mt-8">
        <Button
          onClick={handleSubmit}
          disabled={!isValid}
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
        >
          Continuer vers Présentation Clinique →
        </Button>
      </div>
    </div>
  )
}
