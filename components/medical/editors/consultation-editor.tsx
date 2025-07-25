// src/components/medical/editors/consultation-editor.tsx

"use client"

import { useState, useEffect } from "react"
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
import { consultationDataService } from "@/lib/consultation-data-service"

export default function ConsultationEditor({ 
  consultationData, 
  onSave, 
  onNext, 
  onPrevious,
  patientName,
  patientData,
  clinicalData,
  questionsData,
  diagnosisData,
  doctorData,
  mauritianDocuments
}) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // Helper function to build complete history/anamnesis
  const buildCompleteHistory = () => {
    const parts = []
    
    // Chief complaint and duration
    if (clinicalData?.chiefComplaint) {
      parts.push(`Motif de consultation: ${clinicalData.chiefComplaint}`)
    }
    if (clinicalData?.symptomDuration) {
      parts.push(`Depuis: ${clinicalData.symptomDuration}`)
    }
    
    // Disease history
    if (clinicalData?.diseaseHistory) {
      parts.push(`Histoire de la maladie: ${clinicalData.diseaseHistory}`)
    }
    
    // Current symptoms
    if (clinicalData?.symptoms && Array.isArray(clinicalData.symptoms) && clinicalData.symptoms.length > 0) {
      parts.push(`Symptômes présents: ${clinicalData.symptoms.join(', ')}`)
    }
    
    // Medical history from patient data
    if (patientData?.medicalHistory && Array.isArray(patientData.medicalHistory) && patientData.medicalHistory.length > 0) {
      parts.push(`Antécédents médicaux: ${patientData.medicalHistory.join(', ')}`)
    }
    if (patientData?.otherMedicalHistory) {
      parts.push(`Autres antécédents: ${patientData.otherMedicalHistory}`)
    }
    
    // Allergies
    if (patientData?.allergies && Array.isArray(patientData.allergies) && patientData.allergies.length > 0) {
      parts.push(`Allergies connues: ${patientData.allergies.join(', ')}`)
    }
    if (patientData?.otherAllergies) {
      parts.push(`Autres allergies: ${patientData.otherAllergies}`)
    }
    
    // Current medications
    if (patientData?.currentMedicationsText) {
      parts.push(`Traitements en cours: ${patientData.currentMedicationsText}`)
    }
    
    // Life habits
    if (patientData?.lifeHabits) {
      const habits = []
      if (patientData.lifeHabits.smoking) habits.push(`Tabac: ${patientData.lifeHabits.smoking}`)
      if (patientData.lifeHabits.alcohol) habits.push(`Alcool: ${patientData.lifeHabits.alcohol}`)
      if (patientData.lifeHabits.physicalActivity) habits.push(`Activité physique: ${patientData.lifeHabits.physicalActivity}`)
      if (habits.length > 0) {
        parts.push(`Habitudes de vie: ${habits.join(', ')}`)
      }
    }
    
    // Use existing content if nothing else
    if (parts.length === 0 && consultationData?.content?.history) {
      return consultationData.content.history
    }
    
    return parts.join('\n\n')
  }

  // Helper function to build complete examination
  const buildCompleteExamination = () => {
    const parts = []
    
    // Vital signs
    if (clinicalData?.vitalSigns) {
      const vitals = []
      if (clinicalData.vitalSigns.temperature) {
        vitals.push(`Température: ${clinicalData.vitalSigns.temperature}°C`)
      }
      if (clinicalData.vitalSigns.bloodPressureSystolic && clinicalData.vitalSigns.bloodPressureDiastolic) {
        vitals.push(`TA: ${clinicalData.vitalSigns.bloodPressureSystolic}/${clinicalData.vitalSigns.bloodPressureDiastolic} mmHg`)
      }
      if (clinicalData.vitalSigns.heartRate) {
        vitals.push(`FC: ${clinicalData.vitalSigns.heartRate} bpm`)
      }
      if (clinicalData.vitalSigns.respiratoryRate) {
        vitals.push(`FR: ${clinicalData.vitalSigns.respiratoryRate} /min`)
      }
      if (clinicalData.vitalSigns.oxygenSaturation) {
        vitals.push(`SpO2: ${clinicalData.vitalSigns.oxygenSaturation}%`)
      }
      if (vitals.length > 0) {
        parts.push(`Signes vitaux: ${vitals.join(', ')}`)
      }
    }
    
    // Physical measurements
    if (patientData?.weight && patientData?.height) {
      const bmi = (parseFloat(patientData.weight) / Math.pow(parseFloat(patientData.height) / 100, 2)).toFixed(1)
      parts.push(`Anthropométrie: Poids: ${patientData.weight} kg, Taille: ${patientData.height} cm, IMC: ${bmi} kg/m²`)
    }
    
    // Physical examination findings
    if (clinicalData?.physicalExamDetails) {
      parts.push(`Examen clinique détaillé: ${clinicalData.physicalExamDetails}`)
    }
    
    // General examination placeholder if no specific data
    if (parts.length === 0 || !clinicalData?.physicalExamDetails) {
      parts.push(`Examen général: État général conservé, conscient et orienté`)
      parts.push(`Examen cardiovasculaire: Bruits du cœur réguliers, pas de souffle`)
      parts.push(`Examen pulmonaire: Murmure vésiculaire normal, pas de râles`)
      parts.push(`Examen abdominal: Souple, dépressible, non douloureux`)
      parts.push(`Examen neurologique: Sans particularité`)
    }
    
    // Use existing content if nothing else
    if (parts.length === 0 && consultationData?.content?.examination) {
      return consultationData.content.examination
    }
    
    return parts.join('\n')
  }

  // Helper function to build complete management plan
  const buildCompletePlan = () => {
    const parts = []
    
    // Treatments from diagnosis
    if (diagnosisData?.expertAnalysis?.expert_therapeutics?.primary_treatments) {
      const treatments = diagnosisData.expertAnalysis.expert_therapeutics.primary_treatments
        .map((t: any) => `- ${t.medication_dci}: ${t.dosing_regimen?.standard_adult || t.precise_indication}`)
        .join('\n')
      if (treatments) {
        parts.push(`Traitements prescrits:\n${treatments}`)
      }
    }
    
    // Examinations from diagnosis
    if (diagnosisData?.expertAnalysis?.expert_investigations?.immediate_priority) {
      const exams = diagnosisData.expertAnalysis.expert_investigations.immediate_priority
        .map((e: any) => `- ${e.examination} (${e.urgency})`)
        .join('\n')
      if (exams) {
        parts.push(`Examens à réaliser:\n${exams}`)
      }
    }
    
    // Preventive measures from diagnosis
    if (diagnosisData?.expertAnalysis?.expert_preventive_measures) {
      const preventive = diagnosisData.expertAnalysis.expert_preventive_measures
      if (preventive.immediate_preventive_actions?.length > 0) {
        const actions = preventive.immediate_preventive_actions
          .map((a: any) => `- ${a}`)
          .join('\n')
        parts.push(`Mesures préventives:\n${actions}`)
      }
    }
    
    // Surveillance plan
    parts.push('Surveillance: Réévaluation clinique selon évolution')
    parts.push('Conseils: Hydratation adéquate, repos, consultation si aggravation')
    
    // Use existing content if nothing else
    if (parts.length === 0 && consultationData?.content?.plan) {
      return consultationData.content.plan
    }
    
    return parts.join('\n\n')
  }

  const [formData, setFormData] = useState({
    // Header
    title: consultationData?.header?.title || "COMPTE-RENDU DE CONSULTATION MÉDICALE",
    subtitle: consultationData?.header?.subtitle || "République de Maurice - Médecine Générale",
    date: consultationData?.header?.date || new Date().toISOString().split('T')[0],
    time: consultationData?.header?.time || new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
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

  // Initialize form with comprehensive auto-fill
  useEffect(() => {
    console.log('📝 ConsultationEditor - Auto-filling with all data:', {
      consultationData,
      patientData,
      clinicalData,
      questionsData,
      diagnosisData,
      doctorData,
      mauritianDocuments
    })

    // Build comprehensive form data
    const autoFilledData = {
      // Header - with doctor info
      title: consultationData?.header?.title || "COMPTE-RENDU DE CONSULTATION MÉDICALE",
      subtitle: consultationData?.header?.subtitle || "République de Maurice - Médecine Générale",
      date: new Date().toISOString().split('T')[0], // This gives YYYY-MM-DD format
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      physician: doctorData?.full_name || doctorData?.fullName || consultationData?.header?.physician || "Dr. MÉDECIN EXPERT",
      registration: doctorData?.medical_council_number || doctorData?.medicalCouncilNumber || consultationData?.header?.registration || "COUNCIL-MU-2024-001",
      institution: doctorData?.institution || doctorData?.clinic_name || consultationData?.header?.institution || "Centre Médical Maurice",
      
      // Patient - complete info from all sources with fixed sex field
      firstName: patientData?.firstName || consultationData?.patient?.firstName || "",
      lastName: patientData?.lastName || consultationData?.patient?.lastName || "",
      age: patientData?.age ? `${patientData.age} ans` : consultationData?.patient?.age || "",
      // Fix sex field to show actual value
      sex: (() => {
        // Check various possible gender formats
        const gender = patientData?.gender?.[0] || patientData?.gender || patientData?.sex
        if (gender === 'Masculin' || gender === 'Male' || gender === 'M' || gender === 'Homme') return 'M'
        if (gender === 'Féminin' || gender === 'Female' || gender === 'F' || gender === 'Femme') return 'F'
        // Default based on existing data or F
        return consultationData?.patient?.sex || 'F'
      })(),
      // Format complete address from patient data
      address: (() => {
        if (patientData?.address || patientData?.city || patientData?.country) {
          const parts = []
          if (patientData.address) parts.push(patientData.address)
          if (patientData.city) parts.push(patientData.city)
          parts.push(patientData.country || 'Maurice')
          return parts.filter(Boolean).join(', ')
        }
        return consultationData?.patient?.address || "Adresse à compléter - Maurice"
      })(),
      // Get phone number from patient data with multiple fallbacks
      phone: patientData?.phone || patientData?.phoneNumber || patientData?.phone_number || 
             consultationData?.patient?.phone || "Téléphone à renseigner",
      weight: patientData?.weight || consultationData?.patient?.weight || "",
      height: patientData?.height || consultationData?.patient?.height || "",
      allergies: (() => {
        if (Array.isArray(patientData?.allergies) && patientData.allergies.length > 0) {
          let allergyList = patientData.allergies.join(', ')
          if (patientData.otherAllergies) {
            allergyList += `, ${patientData.otherAllergies}`
          }
          return allergyList
        }
        return consultationData?.patient?.allergies || "Aucune"
      })(),
      
      // Content - from clinical data and diagnosis
      chiefComplaint: clinicalData?.chiefComplaint || consultationData?.content?.chiefComplaint || "",
      history: buildCompleteHistory(),
      examination: buildCompleteExamination(),
      diagnosis: diagnosisData?.diagnosis?.primary?.condition || 
                diagnosisData?.primary?.condition ||
                consultationData?.content?.diagnosis || "",
      plan: buildCompletePlan()
    }

    setFormData(autoFilledData)
  }, [consultationData, patientData, clinicalData, questionsData, diagnosisData, doctorData, mauritianDocuments])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setHasUnsavedChanges(true)
  }

  const handleSave = async () => {
    try {
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
      
      console.log('Saving consultation data:', updatedConsultation)
      
      // Save locally first
      onSave('consultation', updatedConsultation)
      setHasUnsavedChanges(false)
      
      // Get consultation ID
      const consultationId = consultationDataService.getCurrentConsultationId() || 
                            new URLSearchParams(window.location.search).get('consultationId')
      
      if (!consultationId) {
        console.error('No consultation ID found')
        return
      }
      
      console.log('Saving consultation data to DB, ID:', consultationId)
      
      // Get existing data to merge
      const existingData = await consultationDataService.getAllData()
      
      // Build documents structure
      const documentsData = {
        consultation: updatedConsultation,
        prescriptions: existingData?.workflowResult?.prescriptions || {
          medication: {},
          biology: {},
          imaging: {}
        },
        generatedAt: existingData?.workflowResult?.generatedAt || new Date().toISOString(),
        lastModified: new Date().toISOString()
      }
      
      // Save to database
      const result = await consultationDataService.saveToSupabase(
        consultationId,
        4, // documents_data
        documentsData
      )
      
      console.log('Save result:', result)
      
      if (!result) {
        console.error('Failed to save to database')
      }
      
    } catch (error) {
      console.error('Error saving consultation:', error)
    }
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
              <select
                id="sex"
                value={formData.sex}
                onChange={(e) => handleInputChange('sex', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
              >
                <option value="">Sélectionner</option>
                <option value="M">M (Masculin)</option>
                <option value="F">F (Féminin)</option>
              </select>
            </div>
            <div>
              <Label htmlFor="weight">Poids (kg)</Label>
              <Input
                id="weight"
                value={formData.weight}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                placeholder="kg"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="height">Taille (cm)</Label>
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
            <div className="md:col-span-2">
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
              rows={8}
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
              rows={6}
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
              rows={6}
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
