// src/components/medical/editors/paraclinical-editor.tsx

"use client"

import { useState, useEffect } from "react"
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
  Stethoscope, 
  User, 
  Calendar,
  Plus,
  Trash2,
  Eye,
  AlertCircle,
  Zap
} from "lucide-react"

export default function ParaclinicalEditor({ 
  paraclinicalData, 
  onSave, 
  onNext, 
  onPrevious,
  patientName,
  patientData,
  diagnosisData
}) {
  // Debug log to see what data we're receiving
  useEffect(() => {
    console.log('ParaclinicalEditor received:', {
      paraclinicalData,
      patientData,
      diagnosisData
    })
  }, [paraclinicalData, patientData, diagnosisData])

  const [formData, setFormData] = useState({
    // Header
    title: paraclinicalData?.header?.title || "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
    subtitle: paraclinicalData?.header?.subtitle || "PRESCRIPTION D'EXAMENS PARACLINIQUES",
    date: paraclinicalData?.header?.date || new Date().toLocaleDateString('fr-FR'),
    number: paraclinicalData?.header?.number || `PARA-MU-${Date.now()}`,
    physician: paraclinicalData?.header?.physician || "Dr. MÉDECIN EXPERT",
    registration: paraclinicalData?.header?.registration || "COUNCIL-MU-2024-001",
    
    // Patient info - Use patientData if available
    firstName: paraclinicalData?.patient?.firstName || patientData?.firstName || "",
    lastName: paraclinicalData?.patient?.lastName || patientData?.lastName || "",
    age: paraclinicalData?.patient?.age || patientData?.age || "",
    address: paraclinicalData?.patient?.address || "Adresse à compléter - Maurice",
    idNumber: paraclinicalData?.patient?.idNumber || "Carte d'identité mauricienne",
    
    // Prescriptions
    prescriptions: paraclinicalData?.prescriptions || [
      {
        id: 1,
        category: "Imagerie thoracique",
        exam: "Radiographie thoracique de face et profil",
        indication: "Exploration parenchyme pulmonaire selon symptomatologie",
        urgency: "Programmé (1-2 semaines)",
        preparation: "Retrait bijoux et objets métalliques",
        contraindications: "Grossesse (radioprotection)",
        duration: "10 minutes",
        mauritianAvailability: "Hôpitaux publics et centres privés",
        cost: "Gratuit secteur public"
      }
    ]
  })

  // Update form when data changes
  useEffect(() => {
    if (paraclinicalData || patientData) {
      setFormData({
        // Header
        title: paraclinicalData?.header?.title || formData.title,
        subtitle: paraclinicalData?.header?.subtitle || formData.subtitle,
        date: paraclinicalData?.header?.date || formData.date,
        number: paraclinicalData?.header?.number || formData.number,
        physician: paraclinicalData?.header?.physician || formData.physician,
        registration: paraclinicalData?.header?.registration || formData.registration,
        
        // Patient info
        firstName: paraclinicalData?.patient?.firstName || patientData?.firstName || formData.firstName,
        lastName: paraclinicalData?.patient?.lastName || patientData?.lastName || formData.lastName,
        age: paraclinicalData?.patient?.age || patientData?.age || formData.age,
        address: paraclinicalData?.patient?.address || formData.address,
        idNumber: paraclinicalData?.patient?.idNumber || formData.idNumber,
        
        // Prescriptions
        prescriptions: paraclinicalData?.prescriptions || formData.prescriptions
      })
    }
  }, [paraclinicalData, patientData])

  const examCategories = [
    "Imagerie thoracique",
    "Imagerie abdominale", 
    "Imagerie ostéo-articulaire",
    "Imagerie neurologique",
    "Échographie",
    "Scanner (TDM)",
    "IRM",
    "Explorations cardiologiques",
    "Explorations pulmonaires",
    "Endoscopie digestive",
    "Explorations ORL",
    "Explorations ophtalmologiques"
  ]

  const commonExams = {
    "Imagerie thoracique": [
      "Radiographie thoracique de face",
      "Radiographie thoracique de face et profil", 
      "Scanner thoracique sans injection",
      "Scanner thoracique avec injection",
      "IRM thoracique"
    ],
    "Imagerie abdominale": [
      "Radiographie d'abdomen sans préparation (ASP)",
      "Échographie abdominopelvienne",
      "Scanner abdominal sans injection",
      "Scanner abdominal avec injection",
      "IRM abdominale"
    ],
    "Imagerie ostéo-articulaire": [
      "Radiographie standard (préciser localisation)",
      "Scanner ostéo-articulaire",
      "IRM ostéo-articulaire",
      "Arthroscanner",
      "Scintigraphie osseuse"
    ],
    "Échographie": [
      "Échographie abdominopelvienne",
      "Échographie thyroïdienne",
      "Échographie cardiaque (ETT)",
      "Échographie des vaisseaux du cou",
      "Échographie obstétricale",
      "Échographie des parties molles"
    ],
    "Explorations cardiologiques": [
      "ECG de repos 12 dérivations",
      "Échographie cardiaque transthoracique",
      "Épreuve d'effort",
      "Holter ECG 24h",
      "Holter tensionnel 24h",
      "Coronarographie"
    ],
    "Explorations pulmonaires": [
      "Spirométrie (EFR)",
      "Test de marche de 6 minutes",
      "Gazométrie artérielle",
      "Test à la métacholine",
      "Polysomnographie"
    ],
    "Endoscopie digestive": [
      "Fibroscopie œso-gastro-duodénale",
      "Coloscopie totale",
      "Rectosigmoïdoscopie",
      "CPRE (cholangio-pancréatographie rétrograde)",
      "Entéroscopie"
    ]
  }

  const urgencyLevels = [
    "Urgent (dans les heures)",
    "Semi-urgent (24-48h)", 
    "Programmé (1-2 semaines)",
    "Différé (selon disponibilité)"
  ]

  const mauritianCenters = [
    "Hôpital Dr Jeetoo (Port-Louis)",
    "Hôpital Candos (Quatre-Bornes)", 
    "Hôpital Sir Seewoosagur Ramgoolam (Pamplemousses)",
    "Hôpital de Flacq",
    "Clinique Darné (Floréal)",
    "Clinique Wellkin (Moka)",
    "Centre Apollo Bramwell (Moka)",
    "Fortis Clinique Darné"
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

  const addPrescription = () => {
    const newPrescription = {
      id: Date.now(),
      category: "",
      exam: "",
      indication: "",
      urgency: "Programmé (1-2 semaines)",
      preparation: "Aucune préparation spéciale",
      contraindications: "Aucune",
      duration: "À préciser",
      mauritianAvailability: "Centres publics et privés",
      cost: "À vérifier selon secteur"
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

  const handleSave = () => {
    const updatedParaclinical = {
      header: {
        title: formData.title,
        subtitle: formData.subtitle,
        date: formData.date,
        number: formData.number,
        physician: formData.physician,
        registration: formData.registration
      },
      patient: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        age: formData.age,
        address: formData.address,
        idNumber: formData.idNumber
      },
      prescriptions: formData.prescriptions
    }
    
    console.log('Saving paraclinical data:', updatedParaclinical)
    onSave('paraclinical', updatedParaclinical)
  }

  return (
    <div className="space-y-6">
      
      {/* En-tête de l'ordonnance */}
      <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
        <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
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
              <Label htmlFor="number">Numéro d'ordonnance</Label>
              <Input
                id="number"
                value={formData.number}
                onChange={(e) => handleInputChange('number', e.target.value)}
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
        <CardHeader className="bg-gradient-to-r from-teal-500 to-teal-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informations Patient
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="address">Adresse</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="idNumber">N° Carte d'identité</Label>
              <Input
                id="idNumber"
                value={formData.idNumber}
                onChange={(e) => handleInputChange('idNumber', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prescriptions d'examens */}
      <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Examens Prescrits ({formData.prescriptions.length})
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
            <Card key={prescription.id} className="border-l-4 border-green-400 bg-green-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-green-800">
                    Examen #{index + 1}
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
                    <Label htmlFor={`category-${index}`}>Catégorie</Label>
                    <Select
                      value={prescription.category}
                      onValueChange={(value) => handlePrescriptionChange(index, 'category', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choisir une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {examCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor={`exam-${index}`}>Examen spécifique</Label>
                    <Select
                      value={prescription.exam}
                      onValueChange={(value) => handlePrescriptionChange(index, 'exam', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choisir un examen" />
                      </SelectTrigger>
                      <SelectContent>
                        {prescription.category && commonExams[prescription.category] ? 
                          commonExams[prescription.category].map((exam) => (
                            <SelectItem key={exam} value={exam}>
                              {exam}
                            </SelectItem>
                          )) : 
                          <SelectItem value="custom">Examen personnalisé</SelectItem>
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor={`indication-${index}`}>Indication clinique</Label>
                  <Textarea
                    id={`indication-${index}`}
                    value={prescription.indication}
                    onChange={(e) => handlePrescriptionChange(index, 'indication', e.target.value)}
                    className="mt-1"
                    rows={2}
                    placeholder="Justification médicale de l'examen"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`urgency-${index}`}>Urgence</Label>
                    <Select
                      value={prescription.urgency}
                      onValueChange={(value) => handlePrescriptionChange(index, 'urgency', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {urgencyLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor={`duration-${index}`}>Durée estimée</Label>
                    <Input
                      id={`duration-${index}`}
                      value={prescription.duration}
                      onChange={(e) => handlePrescriptionChange(index, 'duration', e.target.value)}
                      className="mt-1"
                      placeholder="15 minutes, 1 heure..."
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor={`preparation-${index}`}>Préparation nécessaire</Label>
                  <Textarea
                    id={`preparation-${index}`}
                    value={prescription.preparation}
                    onChange={(e) => handlePrescriptionChange(index, 'preparation', e.target.value)}
                    className="mt-1"
                    rows={2}
                    placeholder="Instructions pour le patient avant l'examen"
                  />
                </div>
                
                <div>
                  <Label htmlFor={`contraindications-${index}`}>Contre-indications</Label>
                  <Input
                    id={`contraindications-${index}`}
                    value={prescription.contraindications}
                    onChange={(e) => handlePrescriptionChange(index, 'contraindications', e.target.value)}
                    className="mt-1"
                    placeholder="Grossesse, claustrophobie, pacemaker..."
                  />
                </div>
                
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-800 w-full">
                      <strong>Disponibilité Maurice:</strong>
                      <br />
                      <Select
                        value={prescription.mauritianAvailability}
                        onValueChange={(value) => handlePrescriptionChange(index, 'mauritianAvailability', value)}
                      >
                        <SelectTrigger className="mt-1 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Centres publics et privés">Centres publics et privés</SelectItem>
                          <SelectItem value="Hôpitaux publics et centres privés">Hôpitaux publics et centres privés</SelectItem>
                          {mauritianCenters.map((center) => (
                            <SelectItem key={center} value={center}>
                              {center}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="mt-2">
                        <strong>Coût estimé:</strong> {prescription.cost}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <Button 
          variant="outline" 
          onClick={onPrevious}
          className="px-6 py-3 shadow-md hover:shadow-lg transition-all duration-300"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour Biologie
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
            Aperçu
          </Button>
        </div>

        <Button 
          onClick={() => {
            handleSave()
            onNext()
          }}
          className="bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700 text-white px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Ordonnance Médicaments
        </Button>
      </div>
    </div>
  )
}
