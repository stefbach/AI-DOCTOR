// components/medical/editors/paraclinical-editor.tsx - Version corrigée

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
  Stethoscope, 
  User, 
  Calendar,
  Plus,
  Trash2,
  Eye,
  AlertCircle,
  Zap,
  Activity
} from "lucide-react"
import { consultationDataService } from "@/lib/consultation-data-service"

interface ParaclinicalEditorProps {
  paraclinicalData?: any
  onSave: (type: string, data: any) => void
  onNext: () => void
  onPrevious: () => void
  patientName?: string
  patientData?: any
  diagnosisData?: any
  doctorData?: any
}

export default function ParaclinicalEditor({ 
  paraclinicalData, 
  onSave, 
  onNext, 
  onPrevious,
  patientName,
  patientData,
  diagnosisData,
  doctorData
}: ParaclinicalEditorProps) {
  const { toast } = useToast()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  
  // Initialize prescriptions from diagnosis data
  const buildInitialPrescriptions = () => {
    const prescriptions = []
    
    // Check if we have imaging/functional examinations from diagnosis
    if (diagnosisData?.expertAnalysis?.expert_investigations?.immediate_priority) {
      const paraclinicalExams = diagnosisData.expertAnalysis.expert_investigations.immediate_priority
        .filter((exam: any) => exam.category === 'imaging' || exam.category === 'functional')
      
      paraclinicalExams.forEach((exam: any, index: number) => {
        // Determine category based on examination name
        let category = "Imagerie thoracique"
        if (exam.examination?.toLowerCase().includes('echo') || exam.examination?.toLowerCase().includes('écho')) {
          category = "Échographie"
        } else if (exam.examination?.toLowerCase().includes('ecg')) {
          category = "Explorations cardiologiques"
        } else if (exam.examination?.toLowerCase().includes('scanner') || exam.examination?.toLowerCase().includes('tdm')) {
          category = "Scanner (TDM)"
        } else if (exam.examination?.toLowerCase().includes('irm')) {
          category = "IRM"
        } else if (exam.examination?.toLowerCase().includes('radio') && exam.examination?.toLowerCase().includes('thorax')) {
          category = "Imagerie thoracique"
        } else if (exam.examination?.toLowerCase().includes('abdom')) {
          category = "Imagerie abdominale"
        }
        
        prescriptions.push({
          id: Date.now() + index,
          category: category,
          exam: exam.examination || "",
          indication: exam.specific_indication || "",
          urgency: exam.urgency === 'immediate' ? "Urgent (dans les heures)" :
                  exam.urgency === 'urgent' ? "Semi-urgent (24-48h)" :
                  "Programmé (1-2 semaines)",
          preparation: exam.patient_preparation || "Aucune préparation spéciale",
          contraindications: exam.contraindications || "Aucune",
          duration: exam.duration || "15-30 minutes",
          mauritianAvailability: exam.mauritius_availability ? 
            `${exam.mauritius_availability.public_centers?.join(', ') || 'Centres publics et privés'}` :
            "Centres publics et privés",
          cost: exam.mauritius_availability?.estimated_cost || "Gratuit secteur public / Rs 500-2000 privé"
        })
      })
    }
    
    // If no examinations from diagnosis, add a default one
    if (prescriptions.length === 0) {
      prescriptions.push({
        id: Date.now(),
        category: "Imagerie thoracique",
        exam: "Radiographie thoracique de face et profil",
        indication: "Exploration parenchyme pulmonaire selon symptomatologie",
        urgency: "Programmé (1-2 semaines)",
        preparation: "Retrait bijoux et objets métalliques",
        contraindications: "Grossesse (radioprotection)",
        duration: "10 minutes",
        mauritianAvailability: "Hôpitaux publics et centres privés",
        cost: "Gratuit secteur public"
      })
    }
    
    return prescriptions
  }

  const [formData, setFormData] = useState({
    // Header with doctor info
    title: paraclinicalData?.header?.title || "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
    subtitle: paraclinicalData?.header?.subtitle || "PRESCRIPTION D'EXAMENS PARACLINIQUES",
    date: new Date().toISOString().split('T')[0],
    number: paraclinicalData?.header?.number || `PARA-MU-${Date.now()}`,
    physician: doctorData?.full_name || doctorData?.fullName || paraclinicalData?.header?.physician || "Dr. MÉDECIN EXPERT",
    registration: doctorData?.medical_council_number || doctorData?.medicalCouncilNumber || paraclinicalData?.header?.registration || "COUNCIL-MU-2024-001",
    
    // Patient info
    firstName: patientData?.firstName || paraclinicalData?.patient?.firstName || "",
    lastName: patientData?.lastName || paraclinicalData?.patient?.lastName || "",
    age: patientData?.age ? `${patientData.age} ans` : paraclinicalData?.patient?.age || "",
    address: patientData?.address || paraclinicalData?.patient?.address || "Adresse à compléter - Maurice",
    
    // Prescriptions
    prescriptions: paraclinicalData?.prescriptions || buildInitialPrescriptions()
  })

  // Update form when data changes
  useEffect(() => {
    if (paraclinicalData || patientData || doctorData || diagnosisData) {
      setFormData(prev => ({
        title: paraclinicalData?.header?.title || prev.title,
        subtitle: paraclinicalData?.header?.subtitle || prev.subtitle,
        date: new Date().toISOString().split('T')[0],
        number: paraclinicalData?.header?.number || prev.number,
        physician: doctorData?.full_name || doctorData?.fullName || paraclinicalData?.header?.physician || prev.physician,
        registration: doctorData?.medical_council_number || doctorData?.medicalCouncilNumber || paraclinicalData?.header?.registration || prev.registration,
        firstName: patientData?.firstName || paraclinicalData?.patient?.firstName || prev.firstName,
        lastName: patientData?.lastName || paraclinicalData?.patient?.lastName || prev.lastName,
        age: patientData?.age ? `${patientData.age} ans` : paraclinicalData?.patient?.age || prev.age,
        address: patientData?.address || paraclinicalData?.patient?.address || prev.address,
        prescriptions: paraclinicalData?.prescriptions || (prev.prescriptions.length === 0 ? buildInitialPrescriptions() : prev.prescriptions)
      }))
    }
  }, [paraclinicalData, patientData, doctorData, diagnosisData])

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
    "Explorations neurologiques",
    "Endoscopie digestive",
    "Explorations ORL",
    "Explorations ophtalmologiques",
    "Explorations urologiques",
    "Médecine nucléaire"
  ]

  const commonExams = {
    "Imagerie thoracique": [
      "Radiographie thoracique de face",
      "Radiographie thoracique de face et profil", 
      "Scanner thoracique sans injection",
      "Scanner thoracique avec injection",
      "Angioscanner thoracique",
      "IRM thoracique"
    ],
    "Imagerie abdominale": [
      "Radiographie d'abdomen sans préparation (ASP)",
      "Échographie abdominopelvienne",
      "Scanner abdominal sans injection",
      "Scanner abdominal avec injection",
      "Entéroscanner",
      "IRM abdominale",
      "Cholangio-IRM"
    ],
    "Imagerie ostéo-articulaire": [
      "Radiographie standard (préciser localisation)",
      "Scanner ostéo-articulaire",
      "IRM ostéo-articulaire",
      "Arthroscanner",
      "Arthro-IRM",
      "Scintigraphie osseuse",
      "Densitométrie osseuse (DMO)"
    ],
    "Imagerie neurologique": [
      "Scanner cérébral sans injection",
      "Scanner cérébral avec injection",
      "IRM cérébrale",
      "IRM médullaire",
      "Angio-IRM cérébrale",
      "EEG (Électroencéphalogramme)",
      "EMG (Électromyogramme)"
    ],
    "Échographie": [
      "Échographie abdominopelvienne",
      "Échographie thyroïdienne",
      "Échographie cardiaque (ETT)",
      "Échographie cardiaque transoesophagienne (ETO)",
      "Échographie-Doppler des vaisseaux du cou",
      "Échographie-Doppler des membres inférieurs",
      "Échographie rénale et vésicale",
      "Échographie des parties molles",
      "Échographie obstétricale"
    ],
    "Scanner (TDM)": [
      "Scanner cérébral",
      "Scanner thoracique",
      "Scanner abdomino-pelvien",
      "Scanner des sinus",
      "Scanner rachidien",
      "Coroscanner",
      "Angioscanner (préciser territoire)",
      "Scanner corps entier"
    ],
    "IRM": [
      "IRM cérébrale",
      "IRM médullaire",
      "IRM abdominale",
      "IRM pelvienne",
      "IRM ostéo-articulaire (préciser)",
      "IRM cardiaque",
      "Angio-IRM (préciser territoire)",
      "IRM mammaire"
    ],
    "Explorations cardiologiques": [
      "ECG de repos 12 dérivations",
      "Échographie cardiaque transthoracique",
      "Épreuve d'effort",
      "Holter ECG 24h",
      "Holter tensionnel 24h (MAPA)",
      "Coronarographie",
      "Test d'inclinaison (Tilt test)",
      "Scintigraphie myocardique"
    ],
    "Explorations pulmonaires": [
      "Spirométrie (EFR)",
      "Pléthysmographie",
      "Test de marche de 6 minutes",
      "Gazométrie artérielle",
      "Test à la métacholine",
      "DLCO (Diffusion du CO)",
      "Polysomnographie",
      "Polygraphie ventilatoire"
    ],
    "Endoscopie digestive": [
      "Fibroscopie œso-gastro-duodénale (FOGD)",
      "Coloscopie totale",
      "Rectosigmoïdoscopie",
      "CPRE (cholangio-pancréatographie rétrograde)",
      "Entéroscopie",
      "Écho-endoscopie",
      "Vidéocapsule endoscopique"
    ],
    "Explorations urologiques": [
      "Échographie rénale et vésicale",
      "Uroscanner",
      "Uro-IRM",
      "Cystoscopie",
      "Débitmétrie urinaire",
      "Bilan urodynamique",
      "Urétéroscopie"
    ],
    "Médecine nucléaire": [
      "Scintigraphie osseuse",
      "Scintigraphie thyroïdienne",
      "Scintigraphie myocardique",
      "Scintigraphie pulmonaire V/Q",
      "Scintigraphie rénale (DMSA/MAG3)",
      "TEP-Scanner (PET-Scan)"
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
    "Hôpital Jawaharlal Nehru (Rose-Belle)",
    "Clinique Darné (Floréal)",
    "Clinique Wellkin (Moka)",
    "Centre Apollo Bramwell (Moka)",
    "Fortis Clinique Darné",
    "City Clinic (Port-Louis)",
    "Grand Bay Medical and Diagnostic Centre",
    "C-Care (Tamarin)",
    "Centre d'imagerie médicale - St Jean"
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
      category: "",
      exam: "",
      indication: "",
      urgency: "Programmé (1-2 semaines)",
      preparation: "Aucune préparation spéciale",
      contraindications: "Aucune",
      duration: "15-30 minutes",
      mauritianAvailability: "Centres publics et privés",
      cost: "À vérifier selon secteur"
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
        address: formData.address
      },
      prescriptions: formData.prescriptions
    }

    return `
**${updatedParaclinical.header.title}**
**${updatedParaclinical.header.physician}**
Adresse : Cabinet médical, Maurice
📞 +230 xxx xxx xxx | 📧 contact@cabinet.mu
💼 ${updatedParaclinical.header.registration}

**${updatedParaclinical.header.subtitle}**

**Nom du patient :** ${updatedParaclinical.patient.firstName} ${updatedParaclinical.patient.lastName}
**Âge :** ${updatedParaclinical.patient.age}
**Adresse :** ${updatedParaclinical.patient.address}
**Date de prescription :** ${updatedParaclinical.header.date}

🏥 **Examens prescrits :**

${updatedParaclinical.prescriptions.map((item: any, index: number) => `
${index + 1}. **${item.exam}** (${item.category})
   • Indication : ${item.indication}
   • Urgence : ${item.urgency}
   • Préparation : ${item.preparation}
   • Durée estimée : ${item.duration}
   • Contre-indications : ${item.contraindications}
   • Disponibilité Maurice : ${item.mauritianAvailability}
   • Coût : ${item.cost}
`).join('\n')}

💬 **Remarques complémentaires :**
À effectuer dans un centre agréé / service de radiologie reconnu Maurice
Résultats à rapporter à la prochaine consultation avec compte-rendu

═══════════════════════════════════════════════

👨⚕️ **Signature et cachet du médecin :**
${updatedParaclinical.header.physician}
Date : ${updatedParaclinical.header.date}
    `.trim()
  }

  const handleSave = async () => {
    try {
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
          address: formData.address
        },
        prescriptions: formData.prescriptions
      }
      
      console.log('Saving paraclinical data:', updatedParaclinical)
      
      // Save locally first
      onSave('paraclinical', updatedParaclinical)
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
          biology: existingData?.workflowResult?.prescriptions?.biology || {},
          imaging: updatedParaclinical // paraclinical maps to imaging
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
          description: "Examens paracliniques sauvegardés avec succès",
        })
      } else {
        toast({
          title: "Erreur",
          description: "Échec de la sauvegarde en base de données",
          variant: "destructive"
        })
      }
      
    } catch (error) {
      console.error('Error saving paraclinical:', error)
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
          <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="h-6 w-6" />
                Aperçu - Ordonnance Examens Paracliniques
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
                  .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #059669;">$1</strong>')
                  .replace(/═══.*═══/g, '<hr style="border: 2px solid #059669; margin: 20px 0;">')
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
                      <title>Ordonnance Examens Paracliniques</title>
                      <style>
                        body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; margin: 2cm; }
                        strong { color: #059669; }
                        hr { border: 2px solid #059669; margin: 20px 0; }
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
          {formData.prescriptions.map((prescription: any, index: number) => (
            <Card key={prescription.id} className="border-l-4 border-green-400 bg-green-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-green-800 flex items-center gap-2">
                    <Activity className="h-5 w-5" />
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
                    <Input
                      value={prescription.exam}
                      onChange={(e) => handlePrescriptionChange(index, 'exam', e.target.value)}
                      className="mt-2"
                      placeholder="Ou saisir un examen personnalisé..."
                    />
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
                          <SelectItem value="Hôpitaux publics uniquement">Hôpitaux publics uniquement</SelectItem>
                          <SelectItem value="Centres privés uniquement">Centres privés uniquement</SelectItem>
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
          className="bg-gradient-to-r from-teal-600 to-green-600 hover:from-teal-700 hover:to-green-700 text-white px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Ordonnance Médicaments
        </Button>
      </div>
    </div>
  )
}
