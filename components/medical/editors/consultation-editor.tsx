// src/components/medical/editors/consultation-editor.tsx

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowLeft, 
  ArrowRight,
  Save, 
  FileText, 
  User, 
  Calendar,
  Stethoscope,
  Eye
} from "lucide-react"

export default function ConsultationEditor({ 
  consultationData, 
  onSave, 
  onNext, 
  onPrevious,
  patientName 
}) {
  const [formData, setFormData] = useState({
    // Header
    title: consultationData?.header?.title || "COMPTE-RENDU DE CONSULTATION MÉDICALE",
    subtitle: consultationData?.header?.subtitle || "République de Maurice - Médecine Générale",
    date: consultationData?.header?.date || new Date().toLocaleDateString('fr-FR'),
    time: consultationData?.header?.time || new Date().toLocaleTimeString('fr-FR'),
    physician: consultationData?.header?.physician || "Dr. MÉDECIN EXPERT",
    registration: consultationData?.header?.registration || "COUNCIL-MU-2024-001",
    institution: consultationData?.header?.institution || "Centre Médical Maurice",
    
    // Patient
    firstName: consultationData?.patient?.firstName || "",
    lastName: consultationData?.patient?.lastName || "",
    age: consultationData?.patient?.age || "",
    sex: consultationData?.patient?.sex || "",
    address: consultationData?.patient?.address || "Adresse à compléter - Maurice",
    phone: consultationData?.patient?.phone || "Téléphone à renseigner",
    idNumber: consultationData?.patient?.idNumber || "Carte d'identité mauricienne",
    weight: consultationData?.patient?.weight || "",
    height: consultationData?.patient?.height || "",
    allergies: consultationData?.patient?.allergies || "Aucune",
    
    // Content
    chiefComplaint: consultationData?.content?.chiefComplaint || "",
    history: consultationData?.content?.history || "",
    examination: consultationData?.content?.examination || "",
    diagnosis: consultationData?.content?.diagnosis || "",
    plan: consultationData?.content?.plan || ""
  })

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = () => {
    const updatedConsultation = {
      header: {
        title: formData.title,
        subtitle: formData.subtitle,
        date: formData.date,
        time: formData.time,
        physician: formData.physician,
        registration: formData.registration,
        institution: formData.institution
      },
      patient: {
        firstName: formData.firstName,
        lastName: formData.lastName,
        age: formData.age,
        sex: formData.sex,
        address: formData.address,
        phone: formData.phone,
        idNumber: formData.idNumber,
        weight: formData.weight,
        height: formData.height,
        allergies: formData.allergies
      },
      content: {
        chiefComplaint: formData.chiefComplaint,
        history: formData.history,
        examination: formData.examination,
        diagnosis: formData.diagnosis,
        plan: formData.plan
      }
    }
    
    onSave('consultation', updatedConsultation)
  }

  return (
    <div className="space-y-6">
      
      {/* En-tête du document */}
      <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            En-tête du Document
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Titre du document</Label>
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
              <Label htmlFor="time">Heure</Label>
              <Input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => handleInputChange('time', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="physician">Médecin</Label>
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
          <div>
            <Label htmlFor="institution">Institution</Label>
            <Input
              id="institution"
              value={formData.institution}
              onChange={(e) => handleInputChange('institution', e.target.value)}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Informations patient */}
      <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
        <CardHeader className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
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
            <div>
              <Label htmlFor="sex">Sexe</Label>
              <Input
                id="sex"
                value={formData.sex}
                onChange={(e) => handleInputChange('sex', e.target.value)}
                placeholder="M/F"
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
            <div>
              <Label htmlFor="height">Taille</Label>
              <Input
                id="height"
                value={formData.height}
                onChange={(e) => handleInputChange('height', e.target.value)}
                placeholder="cm"
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
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                className="mt-1"
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
            <div>
              <Label htmlFor="allergies">Allergies</Label>
              <Input
                id="allergies"
                value={formData.allergies}
                onChange={(e) => handleInputChange('allergies', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contenu médical */}
      <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            Contenu Médical
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div>
            <Label htmlFor="chiefComplaint">Motif de consultation</Label>
            <Textarea
              id="chiefComplaint"
              value={formData.chiefComplaint}
              onChange={(e) => handleInputChange('chiefComplaint', e.target.value)}
              className="mt-1"
              rows={3}
              placeholder="Motif principal de consultation avec chronologie précise..."
            />
          </div>
          
          <div>
            <Label htmlFor="history">Anamnèse</Label>
            <Textarea
              id="history"
              value={formData.history}
              onChange={(e) => handleInputChange('history', e.target.value)}
              className="mt-1"
              rows={5}
              placeholder="Histoire de la maladie actuelle, antécédents médicaux, chirurgicaux, familiaux..."
            />
          </div>
          
          <div>
            <Label htmlFor="examination">Examen physique</Label>
            <Textarea
              id="examination"
              value={formData.examination}
              onChange={(e) => handleInputChange('examination', e.target.value)}
              className="mt-1"
              rows={5}
              placeholder="Constantes vitales, examen général, examen orienté par appareil..."
            />
          </div>
          
          <div>
            <Label htmlFor="diagnosis">Diagnostic</Label>
            <Textarea
              id="diagnosis"
              value={formData.diagnosis}
              onChange={(e) => handleInputChange('diagnosis', e.target.value)}
              className="mt-1"
              rows={2}
              placeholder="Diagnostic retenu avec degré de certitude..."
            />
          </div>
          
          <div>
            <Label htmlFor="plan">Plan de prise en charge</Label>
            <Textarea
              id="plan"
              value={formData.plan}
              onChange={(e) => handleInputChange('plan', e.target.value)}
              className="mt-1"
              rows={4}
              placeholder="Examens complémentaires, traitement, surveillance, conseils..."
            />
          </div>
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
          Retour Vue d'ensemble
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
          className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Ordonnance Biologie
        </Button>
      </div>
    </div>
  )
}
