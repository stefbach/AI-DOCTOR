// src/components/medical/editors/medication-editor.tsx

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  ArrowLeft, 
  ArrowRight,
  Save, 
  Pill, 
  User, 
  Calendar,
  Plus,
  Trash2,
  Eye,
  AlertTriangle,
  ShieldCheck,
  Download,
  Heart
} from "lucide-react"

export default function MedicationEditor({ 
  medicationData, 
  onSave, 
  onNext, 
  onPrevious,
  patientName,
  patientAge = 30,
  patientAllergies = ""
}) {
  const [formData, setFormData] = useState({
    // Header
    title: medicationData?.header?.title || "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
    subtitle: medicationData?.header?.subtitle || "PRESCRIPTION THÉRAPEUTIQUE",
    date: medicationData?.header?.date || new Date().toLocaleDateString('fr-FR'),
    number: medicationData?.header?.number || `MED-MU-${Date.now()}`,
    physician: medicationData?.header?.physician || "Dr. MÉDECIN EXPERT",
    registration: medicationData?.header?.registration || "COUNCIL-MU-2024-001",
    validity: medicationData?.header?.validity || "Ordonnance valable 3 mois",
    
    // Patient info
    firstName: medicationData?.patient?.firstName || "",
    lastName: medicationData?.patient?.lastName || "",
    age: medicationData?.patient?.age || `${patientAge} ans`,
    weight: medicationData?.patient?.weight || "",
    allergies: medicationData?.patient?.allergies || patientAllergies,
    address: medicationData?.patient?.address || "Adresse à compléter - Maurice",
    idNumber: medicationData?.patient?.idNumber || "Carte d'identité mauricienne",
    pregnancy: medicationData?.patient?.pregnancy || "Non applicable",
    
    // Prescriptions
    prescriptions: medicationData?.prescriptions || [
      {
        id: 1,
        class: "Antalgique non opioïde",
        dci: "Paracétamol",
        brand: "Efferalgan® / Doliprane® (Maurice)",
        dosage: patientAge >= 65 ? "500mg" : "1000mg",
        frequency: "3 fois par jour si douleur",
        duration: "5 jours maximum",
        totalQuantity: "15 comprimés",
        indication: "Traitement symptomatique douleur/fièvre",
        administration: "Per os, avec un grand verre d'eau",
        contraindications: "Insuffisance hépatique sévère",
        precautions: "Dose maximale 4g/24h",
        monitoring: "Efficacité antalgique",
        mauritianAvailability: "Disponible toutes pharmacies Maurice",
        cost: "Médicament essentiel, prix réglementé"
      }
    ],
    
    // Clinical advice
    clinicalAdvice: {
      hydration: medicationData?.clinicalAdvice?.hydration || "Hydratation renforcée (2-3L/jour) climat tropical",
      activity: medicationData?.clinicalAdvice?.activity || "Repos adapté selon symptômes",
      diet: medicationData?.clinicalAdvice?.diet || "Alimentation équilibrée",
      mosquitoProtection: medicationData?.clinicalAdvice?.mosquitoProtection || "Protection anti-moustiques",
      followUp: medicationData?.clinicalAdvice?.followUp || "Consultation réévaluation si pas d'amélioration",
      emergency: medicationData?.clinicalAdvice?.emergency || "Urgences Maurice: 999 (SAMU)"
    }
  })

  const medicationClasses = [
    "Antalgique non opioïde",
    "Antalgique opioïde",
    "Anti-inflammatoire non stéroïdien (AINS)",
    "Antibiotique",
    "Antiviral",
    "Antifongique",
    "Corticoïde",
    "Antihistaminique",
    "Bronchodilatateur",
    "Antihypertenseur",
    "Diurétique",
    "Antidiabétique",
    "Anticoagulant",
    "Antiagrégant plaquettaire",
    "Hypolipémiant",
    "Inhibiteur de la pompe à protons",
    "Antispasmodique",
    "Laxatif",
    "Antidiarrhéique",
    "Vitamine/Complément",
    "Vaccin"
  ]

  const commonMedications = {
    "Antalgique non opioïde": [
      { dci: "Paracétamol", brands: ["Efferalgan®", "Doliprane®", "Dafalgan®"] },
      { dci: "Aspirine", brands: ["Aspégic®", "Kardégic®"] }
    ],
    "Anti-inflammatoire non stéroïdien (AINS)": [
      { dci: "Ibuprofène", brands: ["Brufen®", "Nurofen®", "Advil®"] },
      { dci: "Diclofénac", brands: ["Voltarène®", "Flector®"] },
      { dci: "Naproxène", brands: ["Apranax®", "Naprosyne®"] }
    ],
    "Antibiotique": [
      { dci: "Amoxicilline", brands: ["Clamoxyl®", "Amodex®"] },
      { dci: "Amoxicilline + Acide clavulanique", brands: ["Augmentin®", "Ciblor®"] },
      { dci: "Azithromycine", brands: ["Zithromax®", "Azadose®"] },
      { dci: "Clarithromycine", brands: ["Zeclar®", "Monozeclar®"] }
    ],
    "Corticoïde": [
      { dci: "Prednisolone", brands: ["Solupred®", "Hydrocortancyl®"] },
      { dci: "Bétaméthasone", brands: ["Célestène®", "Diprostène®"] }
    ]
  }

  const frequencyOptions = [
    "1 fois par jour",
    "2 fois par jour", 
    "3 fois par jour",
    "4 fois par jour",
    "Matin seulement",
    "Soir seulement",
    "Matin et soir",
    "Si nécessaire",
    "3 fois par jour si douleur",
    "Toutes les 4 heures",
    "Toutes les 6 heures",
    "Toutes les 8 heures",
    "Toutes les 12 heures"
  ]

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handlePrescriptionChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.map((prescription, i) => 
        i === index ? { ...prescription, [field]: value } : prescription
      )
    }))
  }

  const handleAdviceChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      clinicalAdvice: {
        ...prev.clinicalAdvice,
        [field]: value
      }
    }))
  }

  const addPrescription = () => {
    const newPrescription = {
      id: Date.now(),
      class: "",
      dci: "",
      brand: "",
      dosage: "",
      frequency: "3 fois par jour",
      duration: "7 jours",
      totalQuantity: "",
      indication: "",
      administration: "Per os",
      contraindications: "À vérifier",
      precautions: "Respecter posologie",
      monitoring: "Efficacité et tolérance",
      mauritianAvailability: "À vérifier disponibilité",
      cost: "À préciser"
    }
    
    setFormData(prev => ({
      ...prev,
      prescriptions: [...prev.prescriptions, newPrescription]
    }))
  }

  const removePrescription = (index) => {
    setFormData(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((_, i) => i !== index)
    }))
  }

  const checkAllergyConflict = (medication) => {
    const allergiesList = formData.allergies.toLowerCase()
    return allergiesList.includes(medication.dci.toLowerCase())
  }

  const handleSave = () => {
    const updatedMedication = {
      header: {
        title: formData.title,
        subtitle: formData.subtitle,
        date: formData.date,
        number: formData.number,
        physician: formData.physician,
        registration: formData.registration,
        validity: formData.validity
      },
      patient: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        age: formData.age,
        weight: formData.weight,
        allergies: formData.allergies,
        address: formData.address,
        idNumber: formData.idNumber,
        pregnancy: formData.pregnancy
      },
      prescriptions: formData.prescriptions,
      clinicalAdvice: formData.clinicalAdvice
    }
    
    onSave('medication', updatedMedication)
  }

  return (
    <div className="space-y-6">
      
      {/* En-tête de l'ordonnance */}
      <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            En-tête de l'Ordonnance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="subtitle">Sous-titre</Label>
              <Input
                id="subtitle"
                value={formData.subtitle}
                onChange={(e) => handleInputChange('subtitle', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => handleInputChange('date', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="validity">Validité</Label>
              <Input
                id="validity"
                value={formData.validity}
                onChange={(e) => handleInputChange('validity', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="physician">Médecin prescripteur</Label>
              <Input
                id="physician"
                value={formData.physician}
                onChange={(e) => handleInputChange('physician', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="registration">N° d'enregistrement</Label>
              <Input
                id="registration"
                value={formData.registration}
                onChange={(e) => handleInputChange('registration', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations patient */}
      <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
        <CardHeader className="bg-gradient-to-r from-pink-500 to-pink-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informations Patient
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="age">Âge</Label>
              <Input
                id="age"
                value={formData.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="weight">Poids</Label>
              <Input
                id="weight"
                value={formData.weight}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                placeholder="kg"
                className="mt-1"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="allergies" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Allergies (IMPORTANT)
              </Label>
              <Textarea
                id="allergies"
                value={formData.allergies}
                onChange={(e) => handleInputChange('allergies', e.target.value)}
                className="mt-1 border-red-200 focus:border-red-400"
                rows={2}
                placeholder="Lister toutes les allergies connues"
              />
            </div>
            <div>
              <Label htmlFor="pregnancy">Grossesse/Contraception</Label>
              <Select
                value={formData.pregnancy}
                onValueChange={(value) => handleInputChange('pregnancy', value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Non applicable">Non applicable</SelectItem>
                  <SelectItem value="Grossesse en cours">Grossesse en cours</SelectItem>
                  <SelectItem value="Allaitement">Allaitement</SelectItem>
                  <SelectItem value="Contraception">Sous contraception</SelectItem>
                  <SelectItem value="À vérifier">À vérifier</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prescriptions médicamenteuses */}
      <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
        <CardHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Médicaments Prescrits ({formData.prescriptions.length})
            </div>
            <Button
              onClick={addPrescription}
              variant="outline"
              size="sm"
              className="bg-white/20 border-white/30 text-white hover:bg-white/30"
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {formData.prescriptions.map((prescription, index) => (
            <Card key={prescription.id} className={`border-l-4 ${checkAllergyConflict(prescription) ? 'border-red-500 bg-red-50/50' : 'border-purple-400 bg-purple-50/50'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className={`text-lg ${checkAllergyConflict(prescription) ? 'text-red-800' : 'text-purple-800'}`}>
                    Médicament #{index + 1}
                    {checkAllergyConflict(prescription) && (
                      <Badge variant="destructive" className="ml-2">
                        ⚠️ ALLERGIE PATIENT
                      </Badge>
                    )}
                  </CardTitle>
                  {formData.prescriptions.length > 1 && (
                    <Button
                      onClick={() => removePrescription(index)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-800 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`class-${index}`}>Classe thérapeutique</Label>
                    <Select
                      value={prescription.class}
                      onValueChange={(value) => handlePrescriptionChange(index, 'class', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choisir une classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {medicationClasses.map((medClass) => (
                          <SelectItem key={medClass} value={medClass}>
                            {medClass}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor={`dci-${index}`}>DCI (Dénomination Commune)</Label>
                    <Select
                      value={prescription.dci}
                      onValueChange={(value) => {
                        handlePrescriptionChange(index, 'dci', value)
                        // Auto-remplir les marques si disponibles
                        const medInfo = commonMedications[prescription.class]?.find(med => med.dci === value)
                        if (medInfo) {
                          handlePrescriptionChange(index, 'brand', medInfo.brands.join(' / '))
                        }
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choisir un principe actif" />
                      </SelectTrigger>
                      <SelectContent>
                        {prescription.class && commonMedications[prescription.class] ? 
                          commonMedications[prescription.class].map((med) => (
                            <SelectItem key={med.dci} value={med.dci}>
                              {med.dci}
                            </SelectItem>
                          )) : 
                          <SelectItem value="custom">Principe actif personnalisé</SelectItem>
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor={`brand-${index}`}>Marques disponibles Maurice</Label>
                  <Input
                    id={`brand-${index}`}
                    value={prescription.brand}
                    onChange={(e) => handlePrescriptionChange(index, 'brand', e.target.value)}
                    className="mt-1"
                    placeholder="Marques commerciales locales"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor={`dosage-${index}`}>Dosage</Label>
                    <Input
                      id={`dosage-${index}`}
                      value={prescription.dosage}
                      onChange={(e) => handlePrescriptionChange(index, 'dosage', e.target.value)}
                      className="mt-1"
                      placeholder="500mg, 1g..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`frequency-${index}`}>Fréquence</Label>
                    <Select
                      value={prescription.frequency}
                      onValueChange={(value) => handlePrescriptionChange(index, 'frequency', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {frequencyOptions.map((freq) => (
                          <SelectItem key={freq} value={freq}>
                            {freq}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor={`duration-${index}`}>Durée</Label>
                    <Input
                      id={`duration-${index}`}
                      value={prescription.duration}
                      onChange={(e) => handlePrescriptionChange(index, 'duration', e.target.value)}
                      className="mt-1"
                      placeholder="5 jours, 2 semaines..."
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`indication-${index}`}>Indication</Label>
                    <Textarea
                      id={`indication-${index}`}
                      value={prescription.indication}
                      onChange={(e) => handlePrescriptionChange(index, 'indication', e.target.value)}
                      className="mt-1"
                      rows={2}
                      placeholder="But thérapeutique"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`contraindications-${index}`}>Contre-indications</Label>
                    <Textarea
                      id={`contraindications-${index}`}
                      value={prescription.contraindications}
                      onChange={(e) => handlePrescriptionChange(index, 'contraindications', e.target.value)}
                      className="mt-1"
                      rows={2}
                      placeholder="CI absolues et relatives"
                    />
                  </div>
                </div>
                
                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 mt-0.5" />
                    <div className="text-sm text-emerald-800 space-y-1">
                      <div>
                        <strong>Surveillance:</strong> {prescription.monitoring}
                      </div>
                      <div>
                        <strong>Disponibilité Maurice:</strong> {prescription.mauritianAvailability}
                      </div>
                      <div>
                        <strong>Coût:</strong> {prescription.cost}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Conseils cliniques */}
      <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
        <CardHeader className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Conseils et Suivi
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hydration">Hydratation (climat tropical)</Label>
              <Textarea
                id="hydration"
                value={formData.clinicalAdvice.hydration}
                onChange={(e) => handleAdviceChange('hydration', e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="activity">Activité physique</Label>
              <Textarea
                id="activity"
                value={formData.clinicalAdvice.activity}
                onChange={(e) => handleAdviceChange('activity', e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="diet">Conseils alimentaires</Label>
              <Textarea
                id="diet"
                value={formData.clinicalAdvice.diet}
                onChange={(e) => handleAdviceChange('diet', e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="mosquitoProtection">Protection anti-vectorielle</Label>
              <Textarea
                id="mosquitoProtection"
                value={formData.clinicalAdvice.mosquitoProtection}
                onChange={(e) => handleAdviceChange('mosquitoProtection', e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="followUp">Suivi médical</Label>
              <Textarea
                id="followUp"
                value={formData.clinicalAdvice.followUp}
                onChange={(e) => handleAdviceChange('followUp', e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="emergency">Urgences et contacts</Label>
              <Textarea
                id="emergency"
                value={formData.clinicalAdvice.emergency}
                onChange={(e) => handleAdviceChange('emergency', e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions finales */}
      <div className="flex justify-between items-center">
        <Button 
          variant="outline" 
          onClick={onPrevious}
          className="px-6 py-3 shadow-md hover:shadow-lg transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour Paraclinique
        </Button>

        <div className="flex gap-3">
          <Button 
            variant="outline"
            onClick={handleSave}
            className="px-6 py-3 shadow-md hover:shadow-lg transition-all duration-300"
          >
            <Save className="h-4 w-4 mr-2" />
            Sauvegarder
          </Button>
          
          <Button 
            variant="outline"
            className="px-6 py-3 shadow-md hover:shadow-lg transition-all duration-300"
          >
            <Eye className="h-4 w-4 mr-2" />
            Aperçu Final
          </Button>
          
          <Button 
            variant="outline"
            className="px-6 py-3 shadow-md hover:shadow-lg transition-all duration-300"
          >
            <Download className="h-4 w-4 mr-2" />
            Télécharger Tout
          </Button>
        </div>

        <Button 
          onClick={() => {
            handleSave()
            onNext()
          }}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Finaliser & Terminer
        </Button>
      </div>
    </div>
  )
}
