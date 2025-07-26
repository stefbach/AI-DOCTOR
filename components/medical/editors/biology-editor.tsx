// components/medical/editors/biology-editor.tsx - Version corrigée

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
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
  AlertCircle,
  Activity
} from "lucide-react"
import { consultationDataService } from "@/lib/consultation-data-service"

interface BiologyEditorProps {
  biologyData?: any
  onSave: (type: string, data: any) => void
  onNext: () => void
  onPrevious: () => void
  patientName?: string
  patientData?: any
  diagnosisData?: any
  doctorData?: any
}

export default function BiologyEditor({ 
  biologyData, 
  onSave, 
  onNext, 
  onPrevious,
  patientName,
  patientData,
  diagnosisData,
  doctorData
}: BiologyEditorProps) {
  const { toast } = useToast()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  
  // Initialize prescriptions from diagnosis data
  const buildInitialPrescriptions = () => {
    const prescriptions = []
    
    // Check if we have biology examinations from diagnosis
    if (diagnosisData?.expertAnalysis?.expert_investigations?.immediate_priority) {
      const biologyExams = diagnosisData.expertAnalysis.expert_investigations.immediate_priority
        .filter((exam: any) => exam.category === 'biology')
      
      biologyExams.forEach((exam: any, index: number) => {
        prescriptions.push({
          id: Date.now() + index,
          exam: exam.examination || "",
          indication: exam.specific_indication || "",
          urgency: exam.urgency === 'immediate' ? "Urgent (dans les heures)" :
                  exam.urgency === 'urgent' ? "Semi-urgent (24-48h)" :
                  "Programmé (3-7 jours)",
          fasting: exam.fasting_required ? "Oui - 8h" : "Non",
          expectedResults: exam.interpretation_keys || "",
          sampleType: exam.sample_type || "Sang veineux",
          contraindications: "Aucune",
          mauritianAvailability: exam.mauritius_availability ? 
            `Disponible: ${exam.mauritius_availability.public_centers?.join(', ') || 'Laboratoires Maurice'}` :
            "Disponible laboratoires Maurice",
          cost: exam.mauritius_availability?.estimated_cost || "À vérifier"
        })
      })
    }
    
    // If no examinations from diagnosis, add a default one
    if (prescriptions.length === 0) {
      prescriptions.push({
        id: Date.now(),
        exam: "Hémogramme complet (NFS) + CRP",
        indication: "Recherche syndrome anémique, infectieux, inflammatoire",
        urgency: "Semi-urgent (24-48h)",
        fasting: "Non",
        expectedResults: "Numération globulaire, formule leucocytaire",
        sampleType: "Sang veineux",
        contraindications: "Aucune",
        mauritianAvailability: "Disponible tous laboratoires Maurice",
        cost: "Pris en charge sécurité sociale"
      })
    }
    
    return prescriptions
  }

  const [formData, setFormData] = useState({
    // Header with doctor info
    title: biologyData?.header?.title || "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
    subtitle: biologyData?.header?.subtitle || "PRESCRIPTION D'EXAMENS BIOLOGIQUES",
    date: new Date().toISOString().split('T')[0],
    number: biologyData?.header?.number || `BIO-MU-${Date.now()}`,
    physician: doctorData?.full_name || doctorData?.fullName || biologyData?.header?.physician || "Dr. MÉDECIN EXPERT",
    registration: doctorData?.medical_council_number || doctorData?.medicalCouncilNumber || biologyData?.header?.registration || "COUNCIL-MU-2024-001",
    
    // Patient info
    firstName: patientData?.firstName || biologyData?.patient?.firstName || "",
    lastName: patientData?.lastName || biologyData?.patient?.lastName || "",
    age: patientData?.age ? `${patientData.age} ans` : biologyData?.patient?.age || "",
    address: patientData?.address || biologyData?.patient?.address || "Adresse à compléter - Maurice",
    
    // Prescriptions
    prescriptions: biologyData?.prescriptions || buildInitialPrescriptions()
  })

  // Update form when data changes
  useEffect(() => {
    if (biologyData || patientData || doctorData || diagnosisData) {
      setFormData(prev => ({
        title: biologyData?.header?.title || prev.title,
        subtitle: biologyData?.header?.subtitle || prev.subtitle,
        date: new Date().toISOString().split('T')[0],
        number: biologyData?.header?.number || prev.number,
        physician: doctorData?.full_name || doctorData?.fullName || biologyData?.header?.physician || prev.physician,
        registration: doctorData?.medical_council_number || doctorData?.medicalCouncilNumber || biologyData?.header?.registration || prev.registration,
        firstName: patientData?.firstName || biologyData?.patient?.firstName || prev.firstName,
        lastName: patientData?.lastName || biologyData?.patient?.lastName || prev.lastName,
        age: patientData?.age ? `${patientData.age} ans` : biologyData?.patient?.age || prev.age,
        address: patientData?.address || biologyData?.patient?.address || prev.address,
        prescriptions: biologyData?.prescriptions || (prev.prescriptions.length === 0 ? buildInitialPrescriptions() : prev.prescriptions)
      }))
    }
  }, [biologyData, patientData, doctorData, diagnosisData])

  const commonExams = [
    "Hémogramme complet (NFS)",
    "CRP (Protéine C réactive)",
    "Vitesse de sédimentation (VS)",
    "Ionogramme sanguin complet",
    "Urée + Créatinine",
    "Glycémie à jeun",
    "Bilan lipidique complet",
    "Transaminases (ALAT, ASAT)",
    "Gamma GT + Phosphatases alcalines",
    "Bilirubine totale et conjuguée",
    "Protéines totales + Albumine",
    "Calcium + Phosphore",
    "Magnésium",
    "Fer sérique + Ferritine + Transferrine",
    "Vitamines B12 + D + Folates",
    "TSH + T4 libre",
    "HbA1c (Hémoglobine glyquée)",
    "Troponines cardiaques",
    "BNP ou NT-proBNP",
    "D-Dimères",
    "TP/INR + TCA",
    "Fibrinogène",
    "Sérologies hépatites B et C",
    "Sérologie VIH",
    "Sérologie dengue + chikungunya",
    "ECBU (Examen cytobactériologique urine)",
    "Coproculture + Parasitologie selles",
    "Hémocultures (x3 flacons)",
    "Procalcitonine (PCT)",
    "LDH (Lactate déshydrogénase)",
    "CPK (Créatine phosphokinase)",
    "Acide urique",
    "Electrophorèse des protéines",
    "Marqueurs tumoraux (selon indication)"
  ]

  const urgencyLevels = [
    "Urgent (dans les heures)",
    "Semi-urgent (24-48h)", 
    "Programmé (3-7 jours)",
    "Différé (selon disponibilité)"
  ]

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setHasUnsavedChanges(true)
  }

  const handlePrescriptionChange = (index: number, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.map((prescription: any, i: number) => 
        i === index ? { ...prescription, [field]: value } : prescription
      )
    }))
    setHasUnsavedChanges(true)
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
    setHasUnsavedChanges(true)
  }

  const removePrescription = (index: number) => {
    setFormData(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((_: any, i: number) => i !== index)
    }))
    setHasUnsavedChanges(true)
  }

  // ✅ Generate preview of the formatted document
  const generatePreview = () => {
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
        address: formData.address
      },
      prescriptions: formData.prescriptions
    }

    return `
**${updatedBiology.header.title}**
**${updatedBiology.header.physician}**
Adresse : Cabinet médical, Maurice
📞 +230 xxx xxx xxx | 📧 contact@cabinet.mu
💼 ${updatedBiology.header.registration}

**${updatedBiology.header.subtitle}**

**Nom du patient :** ${updatedBiology.patient.firstName} ${updatedBiology.patient.lastName}
**Âge :** ${updatedBiology.patient.age}
**Adresse :** ${updatedBiology.patient.address}
**Date de prescription :** ${updatedBiology.header.date}

🧪 **Examens demandés :**

${updatedBiology.prescriptions.map((item: any, index: number) => `
${index + 1}. **${item.exam}**
   • Indication : ${item.indication}
   • Urgence : ${item.urgency}
   • Jeûne : ${item.fasting}
   • Type d'échantillon : ${item.sampleType}
   • Disponibilité Maurice : ${item.mauritianAvailability}
`).join('\n')}

💬 **Remarques complémentaires :**
À faire en laboratoire agréé / centre médical reconnu Maurice
Résultats à rapporter à la prochaine consultation

═══════════════════════════════════════════════

👨⚕️ **Signature et cachet du médecin :**
${updatedBiology.header.physician}
Date : ${updatedBiology.header.date}
    `.trim()
  }

  const handleSave = async () => {
    try {
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
          address: formData.address
        },
        prescriptions: formData.prescriptions
      }
      
      console.log('Saving biology data:', updatedBiology)
      
      // Save locally first
      onSave('biology', updatedBiology)
      setHasUnsavedChanges(false)
      
      // ✅ Get consultation ID
      let consultationId = consultationDataService.getCurrentConsultationId()
      if (!consultationId) {
        const urlParams = new URLSearchParams(window.location.search)
        consultationId = urlParams.get('consultationId')
      }
      
      if (!consultationId) {
        console.error('No consultation ID found!')
        toast({
          title: "Erreur",
          description: "ID de consultation manquant",
          variant: "destructive"
        })
        return
      }
      
      // ✅ Get existing data to merge
      const existingData = await consultationDataService.getAllData()
      
      // ✅ Build documents structure
      const documentsData = {
        consultation: existingData?.workflowResult?.consultation || {},
        prescriptions: {
          medication: existingData?.workflowResult?.prescriptions?.medication || {},
          biology: updatedBiology,
          imaging: existingData?.workflowResult?.prescriptions?.imaging || {}
        },
        generatedAt: existingData?.workflowResult?.generatedAt || new Date().toISOString(),
        lastModified: new Date().toISOString()
      }
      
      // ✅ Save to database using the new method
      const result = await consultationDataService.saveToSupabase(
        consultationId,
        4, // documents_data
        documentsData
      )
      
      if (result) {
        toast({
          title: "Succès",
          description: "Examens biologiques sauvegardés avec succès",
        })
      } else {
        toast({
          title: "Erreur",
          description: "Échec de la sauvegarde en base de données",
          variant: "destructive"
        })
      }
      
    } catch (error) {
      console.error('Error saving biology:', error)
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la sauvegarde",
        variant: "destructive"
      })
    }
  }

  // Preview modal
  if (showPreview) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="h-6 w-6" />
                Aperçu - Ordonnance Examens Biologiques
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPreview(false)}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                ✏️ Retour à l'édition
              </Button>
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="bg-white shadow-xl">
          <CardContent className="p-8">
            <div 
              className="font-mono text-sm leading-relaxed whitespace-pre-wrap border p-6 bg-white min-h-[600px]"
              style={{
                fontFamily: 'Arial, sans-serif',
                fontSize: '12px',
                lineHeight: '1.4'
              }}
              dangerouslySetInnerHTML={{
                __html: generatePreview()
                  .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #2563eb;">$1</strong>')
                  .replace(/═══.*═══/g, '<hr style="border: 2px solid #2563eb; margin: 20px 0;">')
                  .replace(/\n/g, '<br>')
              }}
            />
          </CardContent>
        </Card>

        <div className="flex justify-between items-center">
          <Button 
            variant="outline" 
            onClick={() => setShowPreview(false)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à l'édition
          </Button>

          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => {
                const printWindow = window.open('', '_blank')
                if (printWindow) {
                  printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Ordonnance Examens Biologiques</title>
                      <style>
                        body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; margin: 2cm; }
                        strong { color: #2563eb; }
                        hr { border: 2px solid #2563eb; margin: 20px 0; }
                      </style>
                    </head>
                    <body>
                      ${generatePreview().replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>')}
                    </body>
                    </html>
                  `)
                  printWindow.document.close()
                  printWindow.print()
                }
              }}
            >
              <Activity className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
            
            <Button 
              onClick={() => {
                handleSave()
                setShowPreview(false)
              }}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder & Fermer
            </Button>
          </div>
        </div>
      </div>
    )
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
          {formData.prescriptions.map((prescription: any, index: number) => (
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
                        <SelectValue placeholder="Choisir un examen ou saisir manuellement" />
                      </SelectTrigger>
                      <SelectContent>
                        {commonExams.map((exam) => (
                          <SelectItem key={exam} value={exam}>
                            {exam}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      value={prescription.exam}
                      onChange={(e) => handlePrescriptionChange(index, 'exam', e.target.value)}
                      className="mt-2"
                      placeholder="Ou saisir un examen personnalisé..."
                    />
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
            onClick={() => setShowPreview(true)}
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
