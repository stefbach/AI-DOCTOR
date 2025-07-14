"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { User, Weight, AlertTriangle, Plus, X, Activity } from "lucide-react"

interface PatientData {
  firstName: string
  lastName: string
  dateOfBirth: string
  age: number
  gender: string
  weight: number
  height: number
  bloodType: string
  allergies: string[]
  medicalHistory: string[]
  currentMedications: string[]
  insuranceInfo: {
    provider: string
    policyNumber: string
  }
  lifeHabits: {
    smoking: string
    alcohol: string
    physicalActivity: string
  }
}

interface PatientFormProps {
  data?: PatientData
  allData?: any
  onDataChange: (data: PatientData) => void
  onNext: () => void
  onPrevious: () => void
}

export default function PatientForm({ data, onDataChange, onNext }: PatientFormProps) {
  const [formData, setFormData] = useState<PatientData>({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    age: 0,
    gender: "",
    weight: 0,
    height: 0,
    bloodType: "",
    allergies: [],
    medicalHistory: [],
    currentMedications: [],
    insuranceInfo: {
      provider: "",
      policyNumber: "",
    },
    lifeHabits: {
      smoking: "",
      alcohol: "",
      physicalActivity: "",
    },
    ...data,
  })

  const [newAllergy, setNewAllergy] = useState("")
  const [newMedicalHistory, setNewMedicalHistory] = useState("")
  const [newMedication, setNewMedication] = useState("")

  const handleInputChange = (field: string, value: any) => {
    const updatedData = { ...formData, [field]: value }
    setFormData(updatedData)
    onDataChange(updatedData)
  }

  const handleNestedChange = (parent: string, field: string, value: any) => {
    const updatedData = {
      ...formData,
      [parent]: {
        ...formData[parent as keyof PatientData],
        [field]: value,
      },
    }
    setFormData(updatedData)
    onDataChange(updatedData)
  }

  const addToArray = (field: keyof PatientData, value: string, setter: (value: string) => void) => {
    if (value.trim()) {
      const currentArray = formData[field] as string[]
      const updatedData = {
        ...formData,
        [field]: [...currentArray, value.trim()],
      }
      setFormData(updatedData)
      onDataChange(updatedData)
      setter("")
    }
  }

  const removeFromArray = (field: keyof PatientData, index: number) => {
    const currentArray = formData[field] as string[]
    const updatedData = {
      ...formData,
      [field]: currentArray.filter((_, i) => i !== index),
    }
    setFormData(updatedData)
    onDataChange(updatedData)
  }

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const handleDateOfBirthChange = (date: string) => {
    const age = calculateAge(date)
    const updatedData = { ...formData, dateOfBirth: date, age }
    setFormData(updatedData)
    onDataChange(updatedData)
  }

  const isFormValid = () => {
    return (
      formData.firstName &&
      formData.lastName &&
      formData.dateOfBirth &&
      formData.gender &&
      formData.weight > 0 &&
      formData.height > 0
    )
  }

  return (
    <div className="space-y-6">
      {/* Informations personnelles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informations Personnelles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">Prénom *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                placeholder="Prénom du patient"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nom *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                placeholder="Nom du patient"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="dateOfBirth">Date de naissance *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleDateOfBirthChange(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="age">Âge</Label>
              <Input id="age" value={formData.age} readOnly className="bg-gray-50" />
            </div>
            <div>
              <Label htmlFor="gender">Sexe *</Label>
              <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculin</SelectItem>
                  <SelectItem value="F">Féminin</SelectItem>
                  <SelectItem value="Autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Données physiques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Weight className="h-5 w-5" />
            Données Physiques
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="weight">Poids (kg) *</Label>
              <Input
                id="weight"
                type="number"
                value={formData.weight || ""}
                onChange={(e) => handleInputChange("weight", Number.parseFloat(e.target.value) || 0)}
                placeholder="70"
              />
            </div>
            <div>
              <Label htmlFor="height">Taille (cm) *</Label>
              <Input
                id="height"
                type="number"
                value={formData.height || ""}
                onChange={(e) => handleInputChange("height", Number.parseFloat(e.target.value) || 0)}
                placeholder="170"
              />
            </div>
            <div>
              <Label htmlFor="bloodType">Groupe sanguin</Label>
              <Select value={formData.bloodType} onValueChange={(value) => handleInputChange("bloodType", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A+">A+</SelectItem>
                  <SelectItem value="A-">A-</SelectItem>
                  <SelectItem value="B+">B+</SelectItem>
                  <SelectItem value="B-">B-</SelectItem>
                  <SelectItem value="AB+">AB+</SelectItem>
                  <SelectItem value="AB-">AB-</SelectItem>
                  <SelectItem value="O+">O+</SelectItem>
                  <SelectItem value="O-">O-</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.weight > 0 && formData.height > 0 && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm">
                <strong>IMC:</strong> {(formData.weight / (formData.height / 100) ** 2 || 0).toFixed(1)} kg/m²
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Allergies
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newAllergy}
              onChange={(e) => setNewAllergy(e.target.value)}
              placeholder="Ajouter une allergie"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  addToArray("allergies", newAllergy, setNewAllergy)
                }
              }}
            />
            <Button
              type="button"
              onClick={() => addToArray("allergies", newAllergy, setNewAllergy)}
              disabled={!newAllergy.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {formData.allergies.map((allergy, index) => (
              <Badge key={index} variant="destructive" className="flex items-center gap-1">
                {allergy}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeFromArray("allergies", index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Antécédents Médicaux et Chirurgicaux */}
      <Card>
        <CardHeader>
          <CardTitle>Antécédents Médicaux et Chirurgicaux</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newMedicalHistory}
              onChange={(e) => setNewMedicalHistory(e.target.value)}
              placeholder="Ajouter un antécédent médical ou chirurgical"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  addToArray("medicalHistory", newMedicalHistory, setNewMedicalHistory)
                }
              }}
            />
            <Button
              type="button"
              onClick={() => addToArray("medicalHistory", newMedicalHistory, setNewMedicalHistory)}
              disabled={!newMedicalHistory.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {formData.medicalHistory.map((history, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {history}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeFromArray("medicalHistory", index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Médicaments actuels */}
      <Card>
        <CardHeader>
          <CardTitle>Médicaments Actuels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newMedication}
              onChange={(e) => setNewMedication(e.target.value)}
              placeholder="Ajouter un médicament"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  addToArray("currentMedications", newMedication, setNewMedication)
                }
              }}
            />
            <Button
              type="button"
              onClick={() => addToArray("currentMedications", newMedication, setNewMedication)}
              disabled={!newMedication.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {formData.currentMedications.map((medication, index) => (
              <Badge key={index} variant="outline" className="flex items-center gap-1">
                {medication}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0 hover:bg-transparent"
                  onClick={() => removeFromArray("currentMedications", index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Habitudes de Vie */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Habitudes de Vie
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="smoking">Tabac</Label>
              <Select
                value={formData.lifeHabits.smoking}
                onValueChange={(value) => handleNestedChange("lifeHabits", "smoking", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Jamais fumé</SelectItem>
                  <SelectItem value="former">Ancien fumeur</SelectItem>
                  <SelectItem value="current">Fumeur actuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="alcohol">Alcool</Label>
              <Select
                value={formData.lifeHabits.alcohol}
                onValueChange={(value) => handleNestedChange("lifeHabits", "alcohol", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Jamais</SelectItem>
                  <SelectItem value="occasional">Occasionnel</SelectItem>
                  <SelectItem value="regular">Régulier</SelectItem>
                  <SelectItem value="heavy">Important</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="physicalActivity">Activité Physique</Label>
              <Select
                value={formData.lifeHabits.physicalActivity}
                onValueChange={(value) => handleNestedChange("lifeHabits", "physicalActivity", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sedentary">Sédentaire</SelectItem>
                  <SelectItem value="light">Activité légère</SelectItem>
                  <SelectItem value="moderate">Activité modérée</SelectItem>
                  <SelectItem value="intense">Activité intense</SelectItem>
                  <SelectItem value="very-intense">Très intense</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!isFormValid()}>
          Continuer vers l'Examen Clinique
        </Button>
      </div>
    </div>
  )
}
