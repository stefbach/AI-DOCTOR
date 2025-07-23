// src/components/medical/editors/biology-editor.tsx

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
  TestTube, 
  User, 
  Calendar,
  Plus,
  Trash2,
  Eye,
  AlertCircle
} from "lucide-react"

export default function BiologyEditor({ 
  biologyData, 
  onSave, 
  onNext, 
  onPrevious,
  patientName,
  patientData,
  diagnosisData
}) {
  // Debug log to see what data we're receiving
  useEffect(() => {
    console.log('BiologyEditor received:', {
      biologyData,
      patientData,
      diagnosisData
    })
  }, [biologyData, patientData, diagnosisData])

  const [formData, setFormData] = useState({
    // Header
    title: biologyData?.header?.title || "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
    subtitle: biologyData?.header?.subtitle || "PRESCRIPTION D'EXAMENS BIOLOGIQUES",
    date: biologyData?.header?.date || new Date().toLocaleDateString('fr-FR'),
    number: biologyData?.header?.number || `BIO-MU-${Date.now()}`,
    physician: biologyData?.header?.physician || "Dr. MÉDECIN EXPERT",
    registration: biologyData?.header?.registration || "COUNCIL-MU-2024-001",
    
    // Patient info - Use patientData if available
    firstName: biologyData?.patient?.firstName || patientData?.firstName || "",
    lastName: biologyData?.patient?.lastName || patientData?.lastName || "",
    age: biologyData?.patient?.age || patientData?.age || "",
    address: biologyData?.patient?.address || "Adresse à compléter - Maurice",
    idNumber: biologyData?.patient?.idNumber || "Carte d'identité mauricienne",
    
    // Prescriptions
    prescriptions: biologyData?.prescriptions || [
      {
        id: 1,
        exam: "Hémogramme complet (NFS) + CRP",
        indication: "Recherche syndrome anémique, infectieux, inflammatoire",
        urgency: "Semi-urgent",
        fasting: "Non",
        expectedResults: "Numération globulaire, formule leucocytaire",
        sampleType: "Sang veineux",
        contraindications: "Aucune",
        mauritianAvailability: "Disponible tous laboratoires Maurice",
        cost: "Pris en charge sécurité sociale"
      }
    ]
  })

  // Update form when biologyData changes
  useEffect(() => {
    if (biologyData) {
      setFormData({
        title: biologyData.header?.title || formData.title,
        subtitle: biologyData.header?.subtitle || formData.subtitle,
        date: biologyData.header?.date || formData.date,
        number: biologyData.header?.number || formData.number,
        physician: biologyData.header?.physician || formData.physician,
        registration: biologyData.header?.registration || formData.registration,
        firstName: biologyData.patient?.firstName || patientData?.firstName || formData.firstName,
        lastName: biologyData.patient?.lastName || patientData?.lastName || formData.lastName,
        age: biologyData.patient?.age || patientData?.age || formData.age,
        address: biologyData.patient?.address || formData.address,
        idNumber: biologyData.patient?.idNumber || formData.idNumber,
        prescriptions: biologyData.prescriptions || formData.prescriptions
      })
    }
  }, [biologyData, patientData])

  const commonExams = [
    "Hémogramme complet (NFS)",
    "CRP (Protéine C réactive)",
    "Vitesse de sédimentation (VS)",
    "Ionogramme sanguin complet",
    "Urée + Créatinine",
    "Glycémie à jeun",
    "Bilan lipidique",
    "Transaminases (ALAT, ASAT)",
    "Gamma GT + Phosphatases alcalines",
    "Bilirubine totale et conjuguée",
    "Protéines totales + Albumine",
    "Calcium + Phosphore",
    "Magnésium",
    "Fer sérique + Ferritine",
    "Vitamines B12 + D + Folates",
    "TSH + T4 libre",
    "HbA1c (Hémoglobine glyquée)",
    "Troponines cardiaques",
    "BNP ou NT-proBNP",
    "D-Dimères",
    "Sérologies hépatites B et C",
    "Sérologie VIH",
    "ECBU (Examen cytobactériologique urine)",
    "Coproculture + Parasitologie selles"
  ]

  const urgencyLevels = [
    "Urgent (dans les heures)",
    "Semi-urgent (24-48h)", 
    "Programmé (3-7 jours)",
    "Différé (selon disponibilité)"
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
      exam: "",
      indication: "",
      urgency: "Programmé (3-7 jours)",
      fasting: "Non",
      expectedResults: "",
      sampleType: "Sang veineux",
      contraindications: "Aucune",
      mauritianAvailability: "Disponible laboratoires Maurice",
      cost: "À vérifier"
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
    const updatedBiology = {
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
    
    console.log('Saving biology data:', updatedBiology)
    onSave('biology', updatedBiology)
  }

  return (
    <div className="space-y-6">
      
      {/* En-tête de l'ordonnance */}
      <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
        <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white">
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
        <CardHeader className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
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
              <TestTube className="h-5 w-5" />
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
            <Card key={prescription.id} className="border-l-4 border-purple-400 bg-purple-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-purple-800">
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
                  <div className="md:col-span-2">
                    <Label htmlFor={`exam-${index}`}>Examen demandé</Label>
                    <Select
                      value={prescription.exam}
                      onValueChange={(value) => handlePrescriptionChange(index, 'exam', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choisir un examen" />
                      </SelectTrigger>
                      <SelectContent>
                        {commonExams.map((exam) => (
                          <SelectItem key={exam} value={exam}>
                            {exam}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="md:col-span-2">
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
                    <Label htmlFor={`fasting-${index}`}>Jeûne requis</Label>
                    <Select
                      value={prescription.fasting}
                      onValueChange={(value) => handlePrescriptionChange(index, 'fasting', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Non">Non requis</SelectItem>
                        <SelectItem value="Oui - 8h">Oui - 8 heures</SelectItem>
                        <SelectItem value="Oui - 12h">Oui - 12 heures</SelectItem>
                        <SelectItem value="Oui - 24h">Oui - 24 heures</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor={`sampleType-${index}`}>Type d'échantillon</Label>
                    <Input
                      id={`sampleType-${index}`}
                      value={prescription.sampleType}
                      onChange={(e) => handlePrescriptionChange(index, 'sampleType', e.target.value)}
                      className="mt-1"
                      placeholder="Sang veineux, urine, selles..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`contraindications-${index}`}>Contre-indications</Label>
                    <Input
                      id={`contraindications-${index}`}
                      value={prescription.contraindications}
                      onChange={(e) => handlePrescriptionChange(index, 'contraindications', e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <div className="text-sm text-amber-800">
                      <strong>Disponibilité Maurice:</strong> {prescription.mauritianAvailability}
                      <br />
                      <strong>Prise en charge:</strong> {prescription.cost}
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
          Retour Consultation
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
          className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Examens Paracliniques
        </Button>
      </div>
    </div>
  )
}
