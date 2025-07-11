"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { User, ArrowRight, AlertCircle } from "lucide-react"

interface PatientFormProps {
  initialData?: any
  onNext: (data: any) => void
}

export default function PatientForm({ initialData = {}, onNext }: PatientFormProps) {
  const [formData, setFormData] = useState({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    age: initialData?.age || "",
    gender: initialData?.gender || "",
    weight: initialData?.weight || "",
    height: initialData?.height || "",
    socialSecurityNumber: initialData?.socialSecurityNumber || "",
    medicalHistory: initialData?.medicalHistory || "",
    currentMedications: initialData?.currentMedications || "",
    allergies: initialData?.allergies || "",
    emergencyContact: initialData?.emergencyContact || "",
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = useCallback(
    (field: string, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors((prev) => ({ ...prev, [field]: "" }))
      }
    },
    [errors],
  )

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) {
      newErrors.firstName = "Le prénom est requis"
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Le nom est requis"
    }
    if (!formData.age || Number.parseInt(formData.age) < 1 || Number.parseInt(formData.age) > 120) {
      newErrors.age = "L'âge doit être entre 1 et 120 ans"
    }
    if (!formData.gender) {
      newErrors.gender = "Le genre est requis"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onNext(formData)
    }
  }

  const isFormValid = formData.firstName && formData.lastName && formData.age && formData.gender

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <User className="h-6 w-6 mr-3 text-blue-600" />
            Informations Patient
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informations de base */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="firstName">Prénom *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                placeholder="Prénom"
                className={errors.firstName ? "border-red-500" : ""}
              />
              {errors.firstName && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.firstName}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="lastName">Nom *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
                placeholder="Nom de famille"
                className={errors.lastName ? "border-red-500" : ""}
              />
              {errors.lastName && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.lastName}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="age">Âge *</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => handleChange("age", e.target.value)}
                placeholder="Âge en années"
                min="1"
                max="120"
                className={errors.age ? "border-red-500" : ""}
              />
              {errors.age && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.age}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="gender">Genre *</Label>
              <select
                id="gender"
                value={formData.gender}
                onChange={(e) => handleChange("gender", e.target.value)}
                className={`w-full p-2 border rounded-md ${errors.gender ? "border-red-500" : "border-gray-300"}`}
              >
                <option value="">Sélectionner</option>
                <option value="Masculin">Masculin</option>
                <option value="Féminin">Féminin</option>
                <option value="Autre">Autre</option>
              </select>
              {errors.gender && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors.gender}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="weight">Poids (kg)</Label>
              <Input
                id="weight"
                type="number"
                value={formData.weight}
                onChange={(e) => handleChange("weight", e.target.value)}
                placeholder="Poids en kg"
                min="1"
                max="300"
              />
            </div>

            <div>
              <Label htmlFor="height">Taille (cm)</Label>
              <Input
                id="height"
                type="number"
                value={formData.height}
                onChange={(e) => handleChange("height", e.target.value)}
                placeholder="Taille en cm"
                min="50"
                max="250"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="socialSecurityNumber">Numéro de Sécurité Sociale</Label>
            <Input
              id="socialSecurityNumber"
              value={formData.socialSecurityNumber}
              onChange={(e) => handleChange("socialSecurityNumber", e.target.value)}
              placeholder="Numéro de sécurité sociale"
            />
          </div>

          {/* Antécédents médicaux */}
          <div>
            <Label htmlFor="medicalHistory">Antécédents médicaux</Label>
            <Textarea
              id="medicalHistory"
              value={formData.medicalHistory}
              onChange={(e) => handleChange("medicalHistory", e.target.value)}
              placeholder="Antécédents médicaux, chirurgicaux, familiaux..."
              rows={3}
            />
          </div>

          {/* Médicaments actuels */}
          <div>
            <Label htmlFor="currentMedications">Médicaments actuels</Label>
            <Textarea
              id="currentMedications"
              value={formData.currentMedications}
              onChange={(e) => handleChange("currentMedications", e.target.value)}
              placeholder="Liste des médicaments en cours avec posologie..."
              rows={3}
            />
          </div>

          {/* Allergies */}
          <div>
            <Label htmlFor="allergies">Allergies connues</Label>
            <Textarea
              id="allergies"
              value={formData.allergies}
              onChange={(e) => handleChange("allergies", e.target.value)}
              placeholder="Allergies médicamenteuses, alimentaires, environnementales..."
              rows={2}
            />
          </div>

          {/* Contact d'urgence */}
          <div>
            <Label htmlFor="emergencyContact">Contact d'urgence</Label>
            <Input
              id="emergencyContact"
              value={formData.emergencyContact}
              onChange={(e) => handleChange("emergencyContact", e.target.value)}
              placeholder="Nom et téléphone du contact d'urgence"
            />
          </div>

          {/* Bouton suivant */}
          <div className="flex justify-end pt-6">
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              Suivant - Examen Clinique
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
