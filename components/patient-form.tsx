"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { User, ArrowRight, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PatientFormProps {
  data?: any
  onDataChange: (data: any) => void
  onNext: () => void
}

export default function PatientForm({ data = {}, onDataChange, onNext }: PatientFormProps) {
  const [formData, setFormData] = useState({
    firstName: data.firstName || "",
    lastName: data.lastName || "",
    dateOfBirth: data.dateOfBirth || "",
    age: data.age || "",
    gender: data.gender || "",
    phone: data.phone || "",
    email: data.email || "",
    address: data.address || "",
    emergencyContact: data.emergencyContact || "",
    emergencyPhone: data.emergencyPhone || "",
    socialSecurityNumber: data.socialSecurityNumber || "",
    insuranceNumber: data.insuranceNumber || "",
    medicalHistory: data.medicalHistory || "",
    currentMedications: data.currentMedications || "",
    allergies: data.allergies || "",
    familyHistory: data.familyHistory || "",
    smokingStatus: data.smokingStatus || "",
    alcoholConsumption: data.alcoholConsumption || "",
    exerciseFrequency: data.exerciseFrequency || "",
    occupation: data.occupation || "",
    maritalStatus: data.maritalStatus || "",
    hasInsurance: data.hasInsurance || false,
    consentGiven: data.consentGiven || false,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }))
    }
  }

  const calculateAge = (dateOfBirth: string) => {
    if (!dateOfBirth) return ""
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age.toString()
  }

  const handleDateOfBirthChange = (value: string) => {
    handleInputChange("dateOfBirth", value)
    const calculatedAge = calculateAge(value)
    handleInputChange("age", calculatedAge)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) newErrors.firstName = "Le prénom est requis"
    if (!formData.lastName.trim()) newErrors.lastName = "Le nom est requis"
    if (!formData.dateOfBirth) newErrors.dateOfBirth = "La date de naissance est requise"
    if (!formData.gender) newErrors.gender = "Le sexe est requis"
    if (!formData.phone.trim()) newErrors.phone = "Le téléphone est requis"
    if (!formData.consentGiven) newErrors.consentGiven = "Le consentement est requis"

    // Validation email si fourni
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Format d'email invalide"
    }

    // Validation téléphone
    if (formData.phone && !/^[\d\s\-+$$$$]{10,}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Format de téléphone invalide"
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

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <User className="h-6 w-6 mr-3 text-blue-600" />
            Informations Patient
          </CardTitle>
          <p className="text-gray-600">Veuillez remplir les informations du patient</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informations personnelles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prénom *</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                placeholder="Prénom du patient"
                className={errors.firstName ? "border-red-500" : ""}
              />
              {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Nom *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                placeholder="Nom du patient"
                className={errors.lastName ? "border-red-500" : ""}
              />
              {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date de naissance *</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => handleDateOfBirthChange(e.target.value)}
                className={errors.dateOfBirth ? "border-red-500" : ""}
              />
              {errors.dateOfBirth && <p className="text-red-500 text-sm">{errors.dateOfBirth}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="age">Âge</Label>
              <Input
                id="age"
                value={formData.age}
                readOnly
                placeholder="Calculé automatiquement"
                className="bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <Label>Sexe *</Label>
              <RadioGroup
                value={formData.gender}
                onValueChange={(value) => handleInputChange("gender", value)}
                className="flex space-x-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male">Masculin</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female">Féminin</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other">Autre</Label>
                </div>
              </RadioGroup>
              {errors.gender && <p className="text-red-500 text-sm">{errors.gender}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                placeholder="06 12 34 56 78"
                className={errors.phone ? "border-red-500" : ""}
              />
              {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="patient@email.com"
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Adresse</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange("address", e.target.value)}
                placeholder="Adresse complète du patient"
                rows={2}
              />
            </div>
          </div>

          {/* Contact d'urgence */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Contact d'urgence</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="emergencyContact">Nom du contact</Label>
                <Input
                  id="emergencyContact"
                  value={formData.emergencyContact}
                  onChange={(e) => handleInputChange("emergencyContact", e.target.value)}
                  placeholder="Nom du contact d'urgence"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergencyPhone">Téléphone d'urgence</Label>
                <Input
                  id="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={(e) => handleInputChange("emergencyPhone", e.target.value)}
                  placeholder="06 12 34 56 78"
                />
              </div>
            </div>
          </div>

          {/* Informations administratives */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Informations administratives</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="socialSecurityNumber">Numéro de sécurité sociale</Label>
                <Input
                  id="socialSecurityNumber"
                  value={formData.socialSecurityNumber}
                  onChange={(e) => handleInputChange("socialSecurityNumber", e.target.value)}
                  placeholder="1 23 45 67 890 123 45"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="insuranceNumber">Numéro d'assurance</Label>
                <Input
                  id="insuranceNumber"
                  value={formData.insuranceNumber}
                  onChange={(e) => handleInputChange("insuranceNumber", e.target.value)}
                  placeholder="Numéro d'assurance complémentaire"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="occupation">Profession</Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) => handleInputChange("occupation", e.target.value)}
                  placeholder="Profession du patient"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maritalStatus">Situation familiale</Label>
                <Select
                  value={formData.maritalStatus}
                  onValueChange={(value) => handleInputChange("maritalStatus", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Célibataire</SelectItem>
                    <SelectItem value="married">Marié(e)</SelectItem>
                    <SelectItem value="divorced">Divorcé(e)</SelectItem>
                    <SelectItem value="widowed">Veuf/Veuve</SelectItem>
                    <SelectItem value="partnership">Union libre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasInsurance"
                checked={formData.hasInsurance}
                onCheckedChange={(checked) => handleInputChange("hasInsurance", checked)}
              />
              <Label htmlFor="hasInsurance">Le patient possède une assurance complémentaire</Label>
            </div>
          </div>

          {/* Antécédents médicaux */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Antécédents médicaux</h3>

            <div className="space-y-2">
              <Label htmlFor="medicalHistory">Antécédents médicaux personnels</Label>
              <Textarea
                id="medicalHistory"
                value={formData.medicalHistory}
                onChange={(e) => handleInputChange("medicalHistory", e.target.value)}
                placeholder="Maladies antérieures, chirurgies, hospitalisations..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="familyHistory">Antécédents familiaux</Label>
              <Textarea
                id="familyHistory"
                value={formData.familyHistory}
                onChange={(e) => handleInputChange("familyHistory", e.target.value)}
                placeholder="Maladies héréditaires, antécédents familiaux significatifs..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentMedications">Traitements actuels</Label>
              <Textarea
                id="currentMedications"
                value={formData.currentMedications}
                onChange={(e) => handleInputChange("currentMedications", e.target.value)}
                placeholder="Médicaments actuels avec posologie..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Allergies connues</Label>
              <Textarea
                id="allergies"
                value={formData.allergies}
                onChange={(e) => handleInputChange("allergies", e.target.value)}
                placeholder="Allergies médicamenteuses, alimentaires, environnementales..."
                rows={2}
              />
            </div>
          </div>

          {/* Habitudes de vie */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Habitudes de vie</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="smokingStatus">Tabagisme</Label>
                <Select
                  value={formData.smokingStatus}
                  onValueChange={(value) => handleInputChange("smokingStatus", value)}
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

              <div className="space-y-2">
                <Label htmlFor="alcoholConsumption">Consommation d'alcool</Label>
                <Select
                  value={formData.alcoholConsumption}
                  onValueChange={(value) => handleInputChange("alcoholConsumption", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    <SelectItem value="occasional">Occasionnelle</SelectItem>
                    <SelectItem value="moderate">Modérée</SelectItem>
                    <SelectItem value="heavy">Importante</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="exerciseFrequency">Activité physique</Label>
                <Select
                  value={formData.exerciseFrequency}
                  onValueChange={(value) => handleInputChange("exerciseFrequency", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune</SelectItem>
                    <SelectItem value="light">Légère</SelectItem>
                    <SelectItem value="moderate">Modérée</SelectItem>
                    <SelectItem value="intense">Intense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Consentement */}
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Les informations collectées sont confidentielles et utilisées uniquement dans le cadre médical.
              </AlertDescription>
            </Alert>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="consentGiven"
                checked={formData.consentGiven}
                onCheckedChange={(checked) => handleInputChange("consentGiven", checked)}
                className={errors.consentGiven ? "border-red-500" : ""}
              />
              <Label htmlFor="consentGiven" className="text-sm">
                Je consens au traitement de mes données personnelles dans le cadre de ma prise en charge médicale *
              </Label>
            </div>
            {errors.consentGiven && <p className="text-red-500 text-sm">{errors.consentGiven}</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-6 border-t">
            <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 px-8 py-3">
              Continuer vers l'Examen Clinique
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
