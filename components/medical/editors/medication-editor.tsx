// components/medical/editors/medication-editor.tsx - Version corrigée

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
  Pill, 
  User, 
  Calendar,
  Plus,
  Trash2,
  Eye,
  AlertTriangle,
  ShieldCheck,
  Download,
  Heart,
  Activity
} from "lucide-react"
import { consultationDataService } from "@/lib/consultation-data-service"

interface MedicationEditorProps {
  medicationData?: any
  onSave: (type: string, data: any) => void
  onNext: () => void
  onPrevious: () => void
  patientName?: string
  patientAge?: number
  patientAllergies?: string
  patientData?: any
  diagnosisData?: any
  doctorData?: any
}

export default function MedicationEditor({ 
  medicationData, 
  onSave, 
  onNext, 
  onPrevious,
  patientName,
  patientAge = 30,
  patientAllergies = "",
  patientData,
  diagnosisData,
  doctorData
}: MedicationEditorProps) {
  const { toast } = useToast()
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  
  // Initialize prescriptions from diagnosis data
  const buildInitialPrescriptions = () => {
    const prescriptions = []
    
    // Check if we have treatments from diagnosis
    if (diagnosisData?.expertAnalysis?.expert_therapeutics?.primary_treatments) {
      const treatments = diagnosisData.expertAnalysis.expert_therapeutics.primary_treatments
      
      treatments.forEach((treatment: any, index: number) => {
        // Determine medication class based on therapeutic class
        let medClass = "Antibiotique"
        if (treatment.therapeutic_class?.includes("Antalgique") || treatment.therapeutic_class?.includes("Antipyrétique")) {
          medClass = "Antalgique non opioïde"
        } else if (treatment.therapeutic_class?.includes("AINS") || treatment.therapeutic_class?.includes("Anti-inflammatoire")) {
          medClass = "Anti-inflammatoire non stéroïdien (AINS)"
        } else if (treatment.therapeutic_class?.includes("Antibiotique") || treatment.therapeutic_class?.includes("Antibactérien")) {
          medClass = "Antibiotique"
        } else if (treatment.therapeutic_class?.includes("Corticoïde") || treatment.therapeutic_class?.includes("Corticostéroïde")) {
          medClass = "Corticoïde"
        } else if (treatment.therapeutic_class?.includes("Antihistaminique")) {
          medClass = "Antihistaminique"
        } else if (treatment.therapeutic_class?.includes("IPP") || treatment.therapeutic_class?.includes("pompe à protons")) {
          medClass = "Inhibiteur de la pompe à protons"
        }
        
        // Parse dosing regimen for elderly patients
        const isElderly = (patientData?.age || patientAge) >= 65
        const dosing = treatment.dosing_regimen?.standard_adult || ""
        const elderlyDosing = treatment.dosing_regimen?.elderly_adjustment || dosing
        
        prescriptions.push({
          id: Date.now() + index,
          class: medClass,
          dci: treatment.medication_dci || "",
          brand: treatment.mauritius_availability?.brand_names?.join(' / ') || "Marques locales à vérifier",
          dosage: isElderly && elderlyDosing ? elderlyDosing : dosing,
          frequency: extractFrequency(dosing),
          duration: treatment.treatment_duration || "7 jours",
          totalQuantity: calculateQuantity(dosing, treatment.treatment_duration),
          indication: treatment.precise_indication || "",
          administration: treatment.administration_route || "Per os",
          contraindications: treatment.contraindications_absolute?.join(', ') || "À vérifier",
          precautions: treatment.precautions || "Respecter posologie",
          monitoring: treatment.monitoring_parameters?.join(', ') || "Efficacité et tolérance",
          mauritianAvailability: treatment.mauritius_availability?.locally_available ? 
            "Disponible toutes pharmacies Maurice" : "À commander",
          cost: treatment.mauritius_availability?.private_sector_cost || "À préciser"
        })
      })
    }
    
    // If no treatments from diagnosis, add a default one
    if (prescriptions.length === 0) {
      prescriptions.push({
        id: Date.now(),
        class: "Antalgique non opioïde",
        dci: "Paracétamol",
        brand: "Efferalgan® / Doliprane® (Maurice)",
        dosage: (patientData?.age || patientAge) >= 65 ? "500mg" : "1000mg",
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
      })
    }
    
    return prescriptions
  }

  // Helper function to extract frequency from dosing regimen
  const extractFrequency = (dosing: string) => {
    if (dosing.includes('x 3/jour') || dosing.includes('3 fois')) return "3 fois par jour"
    if (dosing.includes('x 2/jour') || dosing.includes('2 fois')) return "2 fois par jour"
    if (dosing.includes('x 4/jour') || dosing.includes('4 fois')) return "4 fois par jour"
    if (dosing.includes('x 1/jour') || dosing.includes('1 fois')) return "1 fois par jour"
    if (dosing.includes('matin et soir')) return "Matin et soir"
    return "3 fois par jour"
  }

  // Helper function to calculate total quantity
  const calculateQuantity = (dosing: string, duration: string) => {
    const daysMatch = duration.match(/(\d+)\s*(jour|day)/i)
    const days = daysMatch ? parseInt(daysMatch[1]) : 7
    
    let dailyDoses = 3 // default
    if (dosing.includes('x 1/jour')) dailyDoses = 1
    if (dosing.includes('x 2/jour')) dailyDoses = 2
    if (dosing.includes('x 3/jour')) dailyDoses = 3
    if (dosing.includes('x 4/jour')) dailyDoses = 4
    
    return `${days * dailyDoses} comprimés`
  }

  const [formData, setFormData] = useState({
    // Header with doctor info
    title: medicationData?.header?.title || "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
    subtitle: medicationData?.header?.subtitle || "PRESCRIPTION THÉRAPEUTIQUE",
    date: new Date().toISOString().split('T')[0],
    number: medicationData?.header?.number || `MED-MU-${Date.now()}`,
    physician: doctorData?.full_name || doctorData?.fullName || medicationData?.header?.physician || "Dr. MÉDECIN EXPERT",
    registration: doctorData?.medical_council_number || doctorData?.medicalCouncilNumber || medicationData?.header?.registration || "COUNCIL-MU-2024-001",
    validity: medicationData?.header?.validity || "Ordonnance valable 3 mois",
    
    // Patient info
    firstName: patientData?.firstName || medicationData?.patient?.firstName || "",
    lastName: patientData?.lastName || medicationData?.patient?.lastName || "",
    age: patientData?.age ? `${patientData.age} ans` : medicationData?.patient?.age || `${patientAge} ans`,
    weight: patientData?.weight || medicationData?.patient?.weight || "",
    allergies: Array.isArray(patientData?.allergies) && patientData.allergies.length > 0 
      ? patientData.allergies.join(', ') 
      : medicationData?.patient?.allergies || patientAllergies || "Aucune",
    address: patientData?.address || medicationData?.patient?.address || "Adresse à compléter - Maurice",
    pregnancy: medicationData?.patient?.pregnancy || "Non applicable",
    
    // Prescriptions
    prescriptions: medicationData?.prescriptions || buildInitialPrescriptions(),
    
    // Clinical advice
    clinicalAdvice: {
      hydration: medicationData?.clinicalAdvice?.hydration || "Hydratation renforcée (2-3L/jour) climat tropical Maurice",
      activity: medicationData?.clinicalAdvice?.activity || "Repos adapté selon symptômes, éviter efforts intenses aux heures chaudes",
      diet: medicationData?.clinicalAdvice?.diet || "Alimentation équilibrée, éviter aliments épicés si troubles digestifs",
      mosquitoProtection: medicationData?.clinicalAdvice?.mosquitoProtection || "Protection anti-moustiques indispensable (dengue/chikungunya endémiques)",
      followUp: medicationData?.clinicalAdvice?.followUp || "Consultation de réévaluation si pas d'amélioration sous 48-72h",
      emergency: medicationData?.clinicalAdvice?.emergency || "Urgences Maurice: 999 (SAMU) - Cliniques 24h: Apollo Bramwell, Wellkin"
    }
  })

  // Update form when data changes
  useEffect(() => {
    if (medicationData || patientData || doctorData || diagnosisData) {
      setFormData(prev => ({
        title: medicationData?.header?.title || prev.title,
        subtitle: medicationData?.header?.subtitle || prev.subtitle,
        date: new Date().toISOString().split('T')[0],
        number: medicationData?.header?.number || prev.number,
        physician: doctorData?.full_name || doctorData?.fullName || medicationData?.header?.physician || prev.physician,
        registration: doctorData?.medical_council_number || doctorData?.medicalCouncilNumber || medicationData?.header?.registration || prev.registration,
        validity: medicationData?.header?.validity || prev.validity,
        firstName: patientData?.firstName || medicationData?.patient?.firstName || prev.firstName,
        lastName: patientData?.lastName || medicationData?.patient?.lastName || prev.lastName,
        age: patientData?.age ? `${patientData.age} ans` : medicationData?.patient?.age || prev.age,
        weight: patientData?.weight || medicationData?.patient?.weight || prev.weight,
        allergies: Array.isArray(patientData?.allergies) && patientData.allergies.length > 0 
          ? patientData.allergies.join(', ') 
          : medicationData?.patient?.allergies || prev.allergies,
        address: patientData?.address || medicationData?.patient?.address || prev.address,
        pregnancy: medicationData?.patient?.pregnancy || prev.pregnancy,
        prescriptions: medicationData?.prescriptions || (prev.prescriptions.length === 0 ? buildInitialPrescriptions() : prev.prescriptions),
        clinicalAdvice: medicationData?.clinicalAdvice || prev.clinicalAdvice
      }))
    }
  }, [medicationData, patientData, doctorData, diagnosisData])

  const medicationClasses = [
    "Antalgique non opioïde",
    "Antalgique opioïde",
    "Anti-inflammatoire non stéroïdien (AINS)",
    "Antibiotique",
    "Antiviral",
    "Antifongique",
    "Antiparasitaire",
    "Corticoïde",
    "Antihistaminique",
    "Bronchodilatateur",
    "Antitussif",
    "Mucolytique",
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
    "Antiémétique",
    "Psychotrope",
    "Vitamine/Complément",
    "Vaccin"
  ]

  const commonMedications = {
    "Antalgique non opioïde": [
      { dci: "Paracétamol", brands: ["Efferalgan®", "Doliprane®", "Dafalgan®", "Panadol®"] },
      { dci: "Aspirine", brands: ["Aspégic®", "Kardégic®", "Aspirine UPSA®"] }
    ],
    "Anti-inflammatoire non stéroïdien (AINS)": [
      { dci: "Ibuprofène", brands: ["Brufen®", "Nurofen®", "Advil®", "Spedifen®"] },
      { dci: "Diclofénac", brands: ["Voltarène®", "Flector®", "Dicloflex®"] },
      { dci: "Naproxène", brands: ["Apranax®", "Naprosyne®", "Aleve®"] },
      { dci: "Kétoprofène", brands: ["Profénid®", "Bi-Profénid®", "Ketum®"] }
    ],
    "Antibiotique": [
      { dci: "Amoxicilline", brands: ["Clamoxyl®", "Amodex®", "Amoxil®"] },
      { dci: "Amoxicilline + Acide clavulanique", brands: ["Augmentin®", "Ciblor®"] },
      { dci: "Azithromycine", brands: ["Zithromax®", "Azadose®", "Azithral®"] },
      { dci: "Clarithromycine", brands: ["Zeclar®", "Monozeclar®", "Klacid®"] },
      { dci: "Ciprofloxacine", brands: ["Ciflox®", "Uniflox®"] },
      { dci: "Céfixime", brands: ["Oroken®", "Suprax®"] },
      { dci: "Doxycycline", brands: ["Vibramycine®", "Doxypalu®", "Tolexine®"] }
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
    "Si nécessaire (max 3/jour)",
    "3 fois par jour si douleur",
    "Toutes les 4 heures",
    "Toutes les 6 heures",
    "Toutes les 8 heures",
    "Toutes les 12 heures",
    "1 fois par semaine",
    "Selon schéma vaccinal"
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

  const handleAdviceChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      clinicalAdvice: {
        ...prev.clinicalAdvice,
        [field]: value
      }
    }))
    setHasUnsavedChanges(true)
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
    setHasUnsavedChanges(true)
  }

  const removePrescription = (index: number) => {
    setFormData(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((_: any, i: number) => i !== index)
    }))
    setHasUnsavedChanges(true)
  }

  const checkAllergyConflict = (medication: any) => {
    const allergiesList = formData.allergies.toLowerCase()
    return allergiesList.includes(medication.dci.toLowerCase())
  }

  // ✅ Generate preview of the formatted document
  const generatePreview = () => {
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
        pregnancy: formData.pregnancy
      },
      prescriptions: formData.prescriptions,
      clinicalAdvice: formData.clinicalAdvice
    }

    return `
**${updatedMedication.header.title}**
**${updatedMedication.header.physician}**
Adresse : Cabinet médical, Maurice
📞 +230 xxx xxx xxx | 📧 contact@cabinet.mu
💼 ${updatedMedication.header.registration}

**${updatedMedication.header.subtitle}**

**Nom du patient :** ${updatedMedication.patient.firstName} ${updatedMedication.patient.lastName}
**Âge :** ${updatedMedication.patient.age}
**Poids :** ${updatedMedication.patient.weight || 'Non renseigné'}
**Allergies :** ⚠️ ${updatedMedication.patient.allergies}
**Adresse :** ${updatedMedication.patient.address}
**Date de prescription :** ${updatedMedication.header.date}

💊 **Médicaments prescrits :**

${updatedMedication.prescriptions.map((item: any, index: number) => `
${index + 1}. **${item.dci}** (${item.class})
   • Marque(s) : ${item.brand}
   • Dosage : ${item.dosage}
   • Fréquence : ${item.frequency}
   • Durée : ${item.duration}
   • Quantité : ${item.totalQuantity}
   • Indication : ${item.indication}
   • Administration : ${item.administration}
   • Disponibilité Maurice : ${item.mauritianAvailability}
`).join('\n')}

🏥 **Conseils et surveillance :**
• Hydratation : ${updatedMedication.clinicalAdvice.hydration}
• Activité : ${updatedMedication.clinicalAdvice.activity}
• Alimentation : ${updatedMedication.clinicalAdvice.diet}
• Protection anti-vectorielle : ${updatedMedication.clinicalAdvice.mosquitoProtection}
• Suivi : ${updatedMedication.clinicalAdvice.followUp}
• Urgences : ${updatedMedication.clinicalAdvice.emergency}

═══════════════════════════════════════════════

👨⚕️ **Signature et cachet du médecin :**
${updatedMedication.header.physician}
${updatedMedication.header.validity}
Date : ${updatedMedication.header.date}
    `.trim()
  }

  const handleSave = async () => {
    try {
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
          pregnancy: formData.pregnancy
        },
        prescriptions: formData.prescriptions,
        clinicalAdvice: formData.clinicalAdvice
      }
      
      console.log('Saving medication data:', updatedMedication)
      
      // Save locally first
      onSave('medication', updatedMedication)
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
          medication: updatedMedication,
          biology: existingData?.workflowResult?.prescriptions?.biology || {},
          imaging: existingData?.workflowResult?.prescriptions?.imaging || {}
        },
        generatedAt: existingData?.workflowResult?.generatedAt || new Date().toISOString(),
        finalizedAt: new Date().toISOString()
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
          description: "Ordonnance médicamenteuse sauvegardée avec succès",
        })
      } else {
        toast({
          title: "Erreur",
          description: "Échec de la sauvegarde en base de données",
          variant: "destructive"
        })
      }
      
    } catch (error) {
      console.error('Error saving medication:', error)
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
          <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="h-6 w-6" />
                Aperçu - Ordonnance Médicamenteuse
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
                  .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #7c3aed;">$1</strong>')
                  .replace(/═══.*═══/g, '<hr style="border: 2px solid #7c3aed; margin: 20px 0;">')
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
                      <title>Ordonnance Médicamenteuse</title>
                      <style>
                        body { font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; margin: 2cm; }
                        strong { color: #7c3aed; }
                        hr { border: 2px solid #7c3aed; margin: 20px 0; }
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
              <Label htmlFor="weight">Poids (kg)</Label>
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
          {formData.prescriptions.map((prescription: any, index: number) => (
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
                        const medInfo = commonMedications[prescription.class]?.find((med: any) => med.dci === value)
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
                          commonMedications[prescription.class].map((med: any) => (
                            <SelectItem key={med.dci} value={med.dci}>
                              {med.dci}
                            </SelectItem>
                          )) : 
                          <SelectItem value="custom">Principe actif personnalisé</SelectItem>
                        }
                      </SelectContent>
                    </Select>
                    <Input
                      value={prescription.dci}
                      onChange={(e) => handlePrescriptionChange(index, 'dci', e.target.value)}
                      className="mt-2"
                      placeholder="Ou saisir un principe actif personnalisé..."
                    />
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`totalQuantity-${index}`}>Quantité totale</Label>
                    <Input
                      id={`totalQuantity-${index}`}
                      value={prescription.totalQuantity}
                      onChange={(e) => handlePrescriptionChange(index, 'totalQuantity', e.target.value)}
                      className="mt-1"
                      placeholder="Ex: 21 comprimés"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`administration-${index}`}>Voie d'administration</Label>
                    <Select
                      value={prescription.administration}
                      onValueChange={(value) => handlePrescriptionChange(index, 'administration', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Per os">Per os (voie orale)</SelectItem>
                        <SelectItem value="Sublingual">Sublingual</SelectItem>
                        <SelectItem value="IM">Intramusculaire (IM)</SelectItem>
                        <SelectItem value="IV">Intraveineux (IV)</SelectItem>
                        <SelectItem value="SC">Sous-cutané (SC)</SelectItem>
                        <SelectItem value="Topique">Application locale</SelectItem>
                        <SelectItem value="Inhalation">Inhalation</SelectItem>
                        <SelectItem value="Rectal">Voie rectale</SelectItem>
                        <SelectItem value="Ophtalmique">Collyre ophtalmique</SelectItem>
                      </SelectContent>
                    </Select>
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
            onClick={() => setShowPreview(true)}
            className="px-6 py-3 shadow-md hover:shadow-lg transition-all duration-300"
          >
            <Eye className="h-4 w-4 mr-2" />
            Aperçu
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
