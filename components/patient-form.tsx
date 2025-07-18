"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRight, User, Heart, AlertTriangle } from "lucide-react"
import { useTibokPatientData } from "@/hooks/use-tibok-patient-data"

interface PatientFormProps {
  onDataChange: (data: any) => void
  onNext: () => void
}

export default function PatientForm({ onDataChange, onNext }: PatientFormProps) {
  const { patientData: tibokPatient, isFromTibok } = useTibokPatientData()
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    gender: "",
    weight: "",
    height: "",
    allergies: [] as string[],
    otherAllergies: "",
    medicalHistory: [] as string[],
    otherMedicalHistory: "",
    currentMedicationsText: "",
    lifeHabits: {
      smoking: "",
      alcohol: "",
      physicalActivity: "",
    },
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const commonAllergies = [
    "Pénicilline",
    "Aspirine",
    "Anti-inflammatoires (AINS)",
    "Codéine",
    "Latex",
    "Iode",
    "Anesthésiques locaux",
    "Sulfamides",
  ]

  const commonMedicalHistory = [
    "Hypertension artérielle",
    "Diabète type 2",
    "Diabète type 1",
    "Asthme",
    "Maladie cardiaque",
    "Dépression/Anxiété",
    "Arthrose",
    "Migraine",
    "Reflux gastro-œsophagien",
    "Hypercholestérolémie",
  ]

  // Helper function to map gender
  const mapGenderToForm = (gender: string | null | undefined): string => {
    if (!gender) return ""
    const lowerGender = gender.toLowerCase()
    if (lowerGender === 'male' || lowerGender === 'masculin' || lowerGender === 'm') {
      return "Masculin"
    } else if (lowerGender === 'female' || lowerGender === 'féminin' || lowerGender === 'f') {
      return "Féminin"
    }
    return gender
  }

  // Auto-fill form with TIBOK patient data
  useEffect(() => {
    if (tibokPatient && isFromTibok) {
      console.log('Auto-filling form with TIBOK patient data:', tibokPatient)
      
      // Map gender value
      let mappedGender = ''
      if (tibokPatient.gender) {
        const genderLower = tibokPatient.gender.toLowerCase()
        if (genderLower === 'm' || genderLower === 'male' || genderLower.includes('mas')) {
          mappedGender = 'Masculin'
        } else if (genderLower === 'f' || genderLower === 'female' || genderLower.includes('fem')) {
          mappedGender = 'Féminin'
        } else {
          mappedGender = tibokPatient.gender
        }
      }
      
      const newFormData = {
        ...formData,
        firstName: tibokPatient.first_name || "",
        lastName: tibokPatient.last_name || "",
        age: tibokPatient.age?.toString() || "",
        gender: mappedGender, // Use the mapped gender value
        weight: tibokPatient.weight?.toString() || "",
        height: tibokPatient.height?.toString() || "",
      }
      
      setFormData(newFormData)
      onDataChange(newFormData)
    }
  }, [tibokPatient, isFromTibok])

  const handleInputChange = (field: string, value: any) => {
    const newData = { ...formData, [field]: value }
    setFormData(newData)
    onDataChange(newData)

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: "" })
    }
  }

  const handleLifeHabitsChange = (field: string, value: string) => {
    const newLifeHabits = { ...formData.lifeHabits, [field]: value }
    const newData = { ...formData, lifeHabits: newLifeHabits }
    setFormData(newData)
    onDataChange(newData)
  }

  const handleAllergyChange = (allergy: string, checked: boolean) => {
    const newAllergies = checked ? [...formData.allergies, allergy] : formData.allergies.filter((a) => a !== allergy)

    const newData = { ...formData, allergies: newAllergies }
    setFormData(newData)
    onDataChange(newData)
  }

  const handleMedicalHistoryChange = (condition: string, checked: boolean) => {
    const newHistory = checked
      ? [...formData.medicalHistory, condition]
      : formData.medicalHistory.filter((h) => h !== condition)

    const newData = { ...formData, medicalHistory: newHistory }
    setFormData(newData)
    onDataChange(newData)
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.firstName.trim()) newErrors.firstName = "Prénom requis"
    if (!formData.lastName.trim()) newErrors.lastName = "Nom requis"
    if (!formData.age || Number.parseInt(formData.age) < 0 || Number.parseInt(formData.age) > 120) {
      newErrors.age = "Âge valide requis (0-120)"
    }
    if (!formData.gender) newErrors.gender = "Sexe requis"
    if (!formData.weight || Number.parseFloat(formData.weight) < 1 || Number.parseFloat(formData.weight) > 300) {
      newErrors.weight = "Poids valide requis (1-300 kg)"
    }
    if (!formData.height || Number.parseFloat(formData.height) < 50 || Number.parseFloat(formData.height) > 250) {
      newErrors.height = "Taille valide requise (50-250 cm)"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (validateForm()) {
      onNext()
    }
  }

  const calculateBMI = () => {
    if (formData.weight && formData.height) {
      const weight = Number.parseFloat(formData.weight)
      const height = Number.parseFloat(formData.height) / 100
      return (weight / (height * height)).toFixed(1)
    }
    return null
  }

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { text: "Insuffisance pondérale", color: "text-blue-600" }
    if (bmi < 25) return { text: "Poids normal", color: "text-green-600" }
    if (bmi < 30) return { text: "Surpoids", color: "text-yellow-600" }
    return { text: "Obésité", color: "text-red-600" }
  }

  const bmi = calculateBMI()
  const bmiCategory = bmi ? getBMICategory(Number.parseFloat(bmi)) : null

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informations Patient
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Show indicator if data was auto-filled from TIBOK */}
      {isFromTibok && tibokPatient && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            ℹ️ Les informations de base ont été pré-remplies depuis TIBOK. Veuillez vérifier et compléter les données manquantes.
          </p>
        </div>
      )}

      {/* Informations personnelles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Identité</CardTitle>
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
                className={errors.firstName ? "border-red-500" : ""}
              />
              {errors.firstName && <p className="text-sm text-red-500 mt-1">{errors.firstName}</p>}
            </div>

            <div>
              <Label htmlFor="lastName">Nom *</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                placeholder="Nom du patient"
                className={errors.lastName ? "border-red-500" : ""}
              />
              {errors.lastName && <p className="text-sm text-red-500 mt-1">{errors.lastName}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="age">Âge *</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => handleInputChange("age", e.target.value)}
                placeholder="Âge en années"
                min="0"
                max="120"
                className={errors.age ? "border-red-500" : ""}
              />
              {errors.age && <p className="text-sm text-red-500 mt-1">{errors.age}</p>}
            </div>

            <div>
              <Label htmlFor="gender">Sexe *</Label>
              <Select
                name="gender"
                value={formData.gender}
                onValueChange={(value) => handleInputChange("gender", value)}
              >
                <SelectTrigger id="gender" className={errors.gender ? "border-red-500" : ""}>
                  <SelectValue placeholder="Sélectionner le sexe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Masculin">Masculin</SelectItem>
                  <SelectItem value="Féminin">Féminin</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && <p className="text-sm text-red-500 mt-1">{errors.gender}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="weight">Poids (kg) *</Label>
              <Input
                id="weight"
                type="number"
                value={formData.weight}
                onChange={(e) => handleInputChange("weight", e.target.value)}
                placeholder="Poids en kg"
                min="1"
                max="300"
                step="0.1"
                className={errors.weight ? "border-red-500" : ""}
              />
              {errors.weight && <p className="text-sm text-red-500 mt-1">{errors.weight}</p>}
            </div>

            <div>
              <Label htmlFor="height">Taille (cm) *</Label>
              <Input
                id="height"
                type="number"
                value={formData.height}
                onChange={(e) => handleInputChange("height", e.target.value)}
                placeholder="Taille en cm"
                min="50"
                max="250"
                className={errors.height ? "border-red-500" : ""}
              />
              {errors.height && <p className="text-sm text-red-500 mt-1">{errors.height}</p>}
            </div>
          </div>

          {bmi && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm">
                <span className="font-medium">IMC calculé:</span> {bmi} kg/m² -{" "}
                <span className={bmiCategory?.color}>{bmiCategory?.text}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5" />
            Allergies Connues
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {commonAllergies.map((allergy) => (
              <div key={allergy} className="flex items-center space-x-2">
                <Checkbox
                  id={`allergy-${allergy}`}
                  checked={formData.allergies.includes(allergy)}
                  onCheckedChange={(checked) => handleAllergyChange(allergy, checked as boolean)}
                />
                <Label htmlFor={`allergy-${allergy}`} className="text-sm">
                  {allergy}
                </Label>
              </div>
            ))}
          </div>

          <div>
            <Label htmlFor="otherAllergies">Autres allergies (texte libre)</Label>
            <Textarea
              id="otherAllergies"
              value={formData.otherAllergies}
              onChange={(e) => handleInputChange("otherAllergies", e.target.value)}
              placeholder="Décrivez toute autre allergie connue (médicaments, aliments, environnement...)"
              rows={3}
            />
          </div>

          {(formData.allergies.length > 0 || formData.otherAllergies) && (
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm font-medium text-red-800 mb-2">Allergies déclarées:</p>
              <div className="flex flex-wrap gap-2">
                {formData.allergies.map((allergy) => (
                  <span key={allergy} className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                    {allergy}
                  </span>
                ))}
                {formData.otherAllergies && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">{formData.otherAllergies}</span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Antécédents médicaux */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="h-5 w-5" />
            Antécédents Médicaux
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {commonMedicalHistory.map((condition) => (
              <div key={condition} className="flex items-center space-x-2">
                <Checkbox
                  id={`history-${condition}`}
                  checked={formData.medicalHistory.includes(condition)}
                  onCheckedChange={(checked) => handleMedicalHistoryChange(condition, checked as boolean)}
                />
                <Label htmlFor={`history-${condition}`} className="text-sm">
                  {condition}
                </Label>
              </div>
            ))}
          </div>

          <div>
            <Label htmlFor="otherMedicalHistory">Autres antécédents médicaux (texte libre)</Label>
            <Textarea
              id="otherMedicalHistory"
              value={formData.otherMedicalHistory}
              onChange={(e) => handleInputChange("otherMedicalHistory", e.target.value)}
              placeholder="Décrivez tout autre antécédent médical, chirurgical, familial important..."
              rows={3}
            />
          </div>

          {(formData.medicalHistory.length > 0 || formData.otherMedicalHistory) && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-800 mb-2">Antécédents déclarés:</p>
              <div className="flex flex-wrap gap-2">
                {formData.medicalHistory.map((condition) => (
                  <span key={condition} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {condition}
                  </span>
                ))}
                {formData.otherMedicalHistory && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    Autres: {formData.otherMedicalHistory.substring(0, 50)}...
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Médicaments actuels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Médicaments Actuels</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="currentMedicationsText">Traitements en cours (texte libre)</Label>
            <Textarea
              id="currentMedicationsText"
              value={formData.currentMedicationsText}
              onChange={(e) => handleInputChange("currentMedicationsText", e.target.value)}
              placeholder="Listez tous les médicaments actuels avec posologies si possible.
Exemple: 
- Paracétamol 1g 3 fois par jour
- Lisinopril 10mg 1 fois le matin
- Oméprazole 20mg avant le petit-déjeuner
- Vitamines, compléments alimentaires..."
              rows={6}
              className="resize-y"
            />
          </div>

          {formData.currentMedicationsText && (
            <div className="mt-3 p-3 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-800">
                ✓ Traitements renseignés (
                {formData.currentMedicationsText.split("\n").filter((line) => line.trim()).length} lignes)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Habitudes de vie */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Habitudes de Vie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Tabac</Label>
              <RadioGroup
                value={formData.lifeHabits.smoking}
                onValueChange={(value) => handleLifeHabitsChange("smoking", value)}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Non-fumeur" id="no-smoking" />
                  <Label htmlFor="no-smoking" className="text-sm">
                    Non-fumeur
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Fumeur actuel" id="current-smoker" />
                  <Label htmlFor="current-smoker" className="text-sm">
                    Fumeur actuel
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Ex-fumeur" id="ex-smoker" />
                  <Label htmlFor="ex-smoker" className="text-sm">
                    Ex-fumeur
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Alcool</Label>
              <RadioGroup
                value={formData.lifeHabits.alcohol}
                onValueChange={(value) => handleLifeHabitsChange("alcohol", value)}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Jamais" id="no-alcohol" />
                  <Label htmlFor="no-alcohol" className="text-sm">
                    Jamais
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Occasionnel" id="occasional-alcohol" />
                  <Label htmlFor="occasional-alcohol" className="text-sm">
                    Occasionnel
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Régulier" id="regular-alcohol" />
                  <Label htmlFor="regular-alcohol" className="text-sm">
                    Régulier
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Activité physique</Label>
              <RadioGroup
                value={formData.lifeHabits.physicalActivity}
                onValueChange={(value) => handleLifeHabitsChange("physicalActivity", value)}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Sédentaire" id="sedentary" />
                  <Label htmlFor="sedentary" className="text-sm">
                    Sédentaire
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Modérée" id="moderate-activity" />
                  <Label htmlFor="moderate-activity" className="text-sm">
                    Modérée
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Intense" id="intense-activity" />
                  <Label htmlFor="intense-activity" className="text-sm">
                    Intense
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-end">
        <Button onClick={handleSubmit} size="lg">
          Continuer vers l'Examen Clinique
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}
