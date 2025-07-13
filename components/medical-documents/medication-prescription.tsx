"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { 
  Pill, 
  User, 
  Plus, 
  Trash2, 
  AlertTriangle, 
  Shield, 
  GraduationCap,
  Globe,
  Thermometer,
  Wifi,
  MapPin,
  Heart,
  Database,
  BookOpen,
  Award,
  Phone,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw
} from "lucide-react"

interface CHUMauritiusPrescriptionConnectedProps {
  patientMauritianData: any
  tropicalClinicalData: any
  expertDiagnosisData: any
  telemedicineData: any
  onPrescriptionGenerated?: (prescription: any) => void
}

interface MauritianMedication {
  id: string
  name: string
  internationalName: string
  strength: string
  form: string
  dosage: string
  frequency: string
  duration: string
  instructions: string
  quantity: string
  refills: string
  mauritianAvailability: 'Public' | 'Private' | 'Import_Required'
  formularyStatus: 'Essential' | 'Supplementary' | 'Hospital_Only'
  tropicalIndication: boolean
  ethnicityCautions: string[]
  monitoring: string[]
  interactions: string[]
  cost: 'Low' | 'Medium' | 'High'
  evidenceLevel: 'A' | 'B' | 'C'
  chuNotes: string
  // Données API
  apiVerified?: boolean
  apiNormalized?: boolean
  verificationData?: any
  normalizationData?: any
}

interface APICallState {
  loading: boolean
  error: string | null
  success: boolean
  data: any
}

export default function CHUMauritiusPrescriptionConnected({
  patientMauritianData,
  tropicalClinicalData,
  expertDiagnosisData,
  telemedicineData,
  onPrescriptionGenerated,
}: CHUMauritiusPrescriptionConnectedProps) {

  const [mauritianDoctorInfo, setMauritianDoctorInfo] = useState({
    name: "Prof. Dr. Rajesh PATEL",
    title: "Professeur Chef de Service",
    specialty: "Médecine Interne et Tropicale",
    chuAffiliation: "CHU Sir Seewoosagur Ramgoolam",
    mauritianMedicalCouncil: "MMC-2024-001234",
    hospitalId: "SSR-INT-001",
    department: "Service de Médecine Interne",
    address: "Pamplemousses, Maurice",
    phone: "+230 266-1234",
    email: "r.patel@chu.maurice.mu",
    telemedicineEnabled: true,
    expertiseAreas: ["Médecine Tropicale", "Télémédecine", "Médecine Interne"]
  })

  const [prescriptionContext, setPrescriptionContext] = useState({
    prescriptionDate: new Date().toLocaleDateString("fr-FR"),
    mauritianDate: new Date().toLocaleDateString("en-GB"),
    validityPeriod: "3 mois",
    prescriptionType: "Consultation",
    urgencyLevel: "Standard",
    seasonalContext: "Hot_Season",
    tropicalConsiderations: "",
    telemedicineNotes: "",
    followUpPlan: "",
    mauritianInsurance: "Public",
    culturalNotes: "",
    emergencyContacts: "SAMU 114 | Police 999"
  })

  const [mauritianMedications, setMauritianMedications] = useState<MauritianMedication[]>([{
    id: "chu-med-1",
    name: "",
    internationalName: "",
    strength: "",
    form: "Comprimé",
    dosage: "",
    frequency: "",
    duration: "",
    instructions: "",
    quantity: "",
    refills: "0",
    mauritianAvailability: 'Public',
    formularyStatus: 'Essential',
    tropicalIndication: false,
    ethnicityCautions: [],
    monitoring: [],
    interactions: [],
    cost: 'Low',
    evidenceLevel: 'B',
    chuNotes: "",
    apiVerified: false,
    apiNormalized: false
  }])

  // États API
  const [drugVerificationAPI, setDrugVerificationAPI] = useState<APICallState>({
    loading: false,
    error: null,
    success: false,
    data: null
  })

  const [rxNormAPI, setRxNormAPI] = useState<APICallState>({
    loading: false,
    error: null,
    success: false,
    data: null
  })

  const [emergencyAlert, setEmergencyAlert] = useState<string | null>(null)
  const [apiProcessingStep, setApiProcessingStep] = useState<string>("")

  // Détection automatique urgence
  useEffect(() => {
    if (expertDiagnosisData?.emergencyFlags?.emergencyLevel === 'critical') {
      setEmergencyAlert("🚨 URGENCE CRITIQUE - Hospitalisation immédiate - SAMU 114")
      setPrescriptionContext(prev => ({ ...prev, urgencyLevel: "Critical" }))
    } else if (expertDiagnosisData?.emergencyFlags?.emergencyLevel === 'high') {
      setEmergencyAlert("⚠️ URGENCE - Consultation rapide requise")
      setPrescriptionContext(prev => ({ ...prev, urgencyLevel: "High" }))
    }
  }, [expertDiagnosisData])

  // Adaptation saisonnière automatique
  useEffect(() => {
    const month = new Date().getMonth()
    let season = "Hot_Season"
    let considerations = ""
    
    if (month >= 10 || month <= 3) {
      season = "Rainy_Season"
      considerations = "Surveillance dengue/chikungunya. Éviter aspirine si fièvre."
    } else if (month >= 4 && month <= 5) {
      season = "Cyclone_Season" 
      considerations = "Stock médicaments urgence. Plan évacuation si nécessaire."
    } else {
      season = "Hot_Season"
      considerations = "Hydratation renforcée. Protection solaire avec doxycycline."
    }
    
    setPrescriptionContext(prev => ({
      ...prev,
      seasonalContext: season,
      tropicalConsiderations: considerations
    }))
  }, [])

  // Initialisation automatique depuis diagnostic expert
  useEffect(() => {
    if (expertDiagnosisData?.expertTherapeutics?.evidenceBasedMedications) {
      const expertMedications = expertDiagnosisData.expertTherapeutics.evidenceBasedMedications.map((med: any, index: number) => ({
        id: `expert-med-${index}`,
        name: med.name,
        internationalName: med.name,
        strength: extractStrength(med.dosage),
        form: "Comprimé",
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        instructions: med.indication,
        quantity: calculateQuantity(med.frequency, med.duration),
        refills: "0",
        mauritianAvailability: med.mauritianAvailability || 'Public',
        formularyStatus: 'Essential',
        tropicalIndication: med.tropicalIndication || false,
        ethnicityCautions: med.contraindications?.relative || [],
        monitoring: med.sideEffects?.monitoring ? [med.sideEffects.monitoring] : [],
        interactions: [],
        cost: med.cost || 'Low',
        evidenceLevel: med.evidenceLevel || 'B',
        chuNotes: "",
        apiVerified: false,
        apiNormalized: false
      }))
      
      setMauritianMedications(expertMedications.length > 0 ? expertMedications : mauritianMedications)
    }
  }, [expertDiagnosisData])

  const mauritianMedicationForms = [
    "Comprimé", "Gélule", "Sirop", "Solution", "Suspension", 
    "Pommade", "Crème", "Gel", "Suppositoire", "Injection",
    "Gouttes", "Spray nasal", "Inhalateur", "Patch", "Tisane"
  ]

  const tropicalFrequencies = [
    "1 fois par jour (matin)",
    "2 fois par jour (matin/soir)",
    "3 fois par jour (repas)",
    "4 fois par jour",
    "Matin à jeun",
    "Soir au coucher",
    "Avant repas",
    "Pendant repas",
    "Après repas",
    "Toutes les 6h",
    "Toutes les 8h",
    "Si fièvre >38°C",
    "Si douleur",
    "Prophylaxie vectorielle"
  ]

  const mauritianDurations = [
    "3 jours", "5 jours", "7 jours", "10 jours", "14 jours",
    "3 semaines", "1 mois", "2 mois", "3 mois", "6 mois",
    "Traitement d'attaque: 14 jours",
    "Prophylaxie saisonnière",
    "Traitement au long cours",
    "Jusqu'amélioration complète",
    "Selon évolution clinique"
  ]

  // Fonctions API
  const callDrugVerificationAPI = async (medications: MauritianMedication[]) => {
    setDrugVerificationAPI({ loading: true, error: null, success: false, data: null })
    setApiProcessingStep("Vérification sécurité médicamenteuse...")

    try {
      const requestData = {
        medications: medications.map(med => med.name).filter(name => name.trim()),
        patientProfile: {
          age: patientMauritianData?.age,
          ethnicity: patientMauritianData?.ethnicity,
          comorbidities: patientMauritianData?.medicalHistory || [],
          currentMedications: patientMauritianData?.medications || [],
          allergies: patientMauritianData?.allergies || [],
          renalFunction: 'Normal', // À adapter selon données patient
          weight: patientMauritianData?.weight
        },
        checkTraditionalMedicine: true,
        mauritianContext: true
      }

      const response = await fetch('/api/drug-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) throw new Error(`Erreur API: ${response.status}`)

      const data = await response.json()
      
      setDrugVerificationAPI({ 
        loading: false, 
        error: null, 
        success: true, 
        data 
      })

      // Mettre à jour les médicaments avec les données de vérification
      updateMedicationsWithVerification(data)
      
    } catch (error: any) {
      setDrugVerificationAPI({ 
        loading: false, 
        error: error.message, 
        success: false, 
        data: null 
      })
    }
  }

  const callRxNormAPI = async (medications: MauritianMedication[]) => {
    setRxNormAPI({ loading: true, error: null, success: false, data: null })
    setApiProcessingStep("Normalisation pharmaceutique RxNorm...")

    try {
      const promises = medications
        .filter(med => med.name.trim())
        .map(async (med) => {
          const requestData = {
            medication: med.name,
            context: {
              indication: med.instructions,
              patientAge: patientMauritianData?.age,
              ethnicity: patientMauritianData?.ethnicity,
              region: patientMauritianData?.region,
              language: 'french'
            },
            searchDepth: 'comprehensive'
          }

          const response = await fetch('/api/rxnorm-normalization', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
          })

          if (!response.ok) throw new Error(`Erreur RxNorm: ${response.status}`)
          return await response.json()
        })

      const results = await Promise.all(promises)
      
      setRxNormAPI({ 
        loading: false, 
        error: null, 
        success: true, 
        data: results 
      })

      // Mettre à jour les médicaments avec normalisation
      updateMedicationsWithNormalization(results)

    } catch (error: any) {
      setRxNormAPI({ 
        loading: false, 
        error: error.message, 
        success: false, 
        data: null 
      })
    }
  }

  const updateMedicationsWithVerification = (verificationData: any) => {
    setMauritianMedications(prev => prev.map(med => {
      const verification = verificationData.data?.medications?.find((v: any) => 
        v.medication.toLowerCase() === med.name.toLowerCase()
      )
      
      if (verification) {
        return {
          ...med,
          apiVerified: true,
          verificationData: verification,
          ethnicityCautions: verification.contraindications?.applicable || med.ethnicityCautions,
          monitoring: verification.monitoring?.clinicalSigns || med.monitoring,
          interactions: verification.interactionMatrix?.interactions?.map((i: any) => i.description) || med.interactions,
          mauritianAvailability: verification.mauritianSpecifics?.availability || med.mauritianAvailability,
          cost: verification.mauritianSpecifics?.cost || med.cost,
          chuNotes: verification.clinicalNotes?.join('; ') || med.chuNotes
        }
      }
      return med
    }))
  }

  const updateMedicationsWithNormalization = (normalizationResults: any[]) => {
    setMauritianMedications(prev => prev.map((med, index) => {
      const normalization = normalizationResults[index]
      
      if (normalization?.success && normalization.data) {
        return {
          ...med,
          apiNormalized: true,
          normalizationData: normalization.data,
          internationalName: normalization.data.normalizedMedication?.internationalName || med.internationalName,
          formularyStatus: normalization.data.normalizedMedication?.regulatory?.formularyStatus || med.formularyStatus,
          evidenceLevel: normalization.data.normalizedMedication?.evidenceLevel || med.evidenceLevel,
          tropicalIndication: normalization.data.normalizedMedication?.tropicalMedicine?.endemicRelevance || med.tropicalIndication
        }
      }
      return med
    }))
  }

  // Fonction de traitement complet IA
  const processWithAI = async () => {
    const validMedications = mauritianMedications.filter(med => med.name.trim())
    
    if (validMedications.length === 0) {
      alert("Veuillez ajouter au moins un médicament")
      return
    }

    setApiProcessingStep("Initialisation traitement IA...")

    try {
      // Étape 1: Normalisation RxNorm
      await callRxNormAPI(validMedications)
      
      // Étape 2: Vérification sécurité
      await callDrugVerificationAPI(validMedications)
      
      setApiProcessingStep("Traitement IA complété ✅")
      
      // Génération prescription finale
      setTimeout(() => {
        generateFinalPrescription()
        setApiProcessingStep("")
      }, 1000)

    } catch (error) {
      console.error("Erreur traitement IA:", error)
      setApiProcessingStep("Erreur traitement IA ❌")
    }
  }

  const generateFinalPrescription = () => {
    const prescription = {
      header: mauritianDoctorInfo,
      patient: patientMauritianData,
      context: prescriptionContext,
      medications: mauritianMedications.filter(med => med.name.trim()),
      apiResults: {
        drugVerification: drugVerificationAPI.data,
        rxNormalization: rxNormAPI.data,
        processed: true,
        timestamp: new Date().toISOString()
      },
      tropical: {
        seasonalContext: prescriptionContext.seasonalContext,
        tropicalConsiderations: prescriptionContext.tropicalConsiderations,
        emergencyLevel: emergencyAlert
      },
      telemedicine: telemedicineData,
      metadata: {
        expertLevel: "CHU_Professor",
        evidenceLevel: "A",
        mauritianFormularyVersion: "2024.12"
      }
    }

    console.log("🏥 Prescription CHU Maurice générée avec IA:", prescription)
    
    if (onPrescriptionGenerated) {
      onPrescriptionGenerated(prescription)
    }
  }

  // Handlers
  const handleDoctorChange = useCallback((field: string, value: string | boolean | string[]) => {
    setMauritianDoctorInfo((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handlePrescriptionContextChange = useCallback((field: string, value: string) => {
    setPrescriptionContext((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleMedicationChange = useCallback((id: string, field: string, value: any) => {
    setMauritianMedications((prev) => 
      prev.map((med) => (med.id === id ? { ...med, [field]: value } : med))
    )
  }, [])

  const addMauritianMedication = useCallback(() => {
    const newMed: MauritianMedication = {
      id: `chu-med-${Date.now()}`,
      name: "",
      internationalName: "",
      strength: "",
      form: "Comprimé",
      dosage: "",
      frequency: "",
      duration: "",
      instructions: "",
      quantity: "",
      refills: "0",
      mauritianAvailability: 'Public',
      formularyStatus: 'Essential',
      tropicalIndication: false,
      ethnicityCautions: [],
      monitoring: [],
      interactions: [],
      cost: 'Low',
      evidenceLevel: 'B',
      chuNotes: "",
      apiVerified: false,
      apiNormalized: false
    }
    setMauritianMedications((prev) => [...prev, newMed])
  }, [])

  const removeMedication = useCallback((id: string) => {
    setMauritianMedications((prev) => prev.filter((med) => med.id !== id))
  }, [])

  // Fonctions utilitaires
  const extractStrength = (dosage: string): string => {
    const match = dosage?.match(/(\d+\s*(?:mg|g|ml|%))/)
    return match ? match[1] : ""
  }

  const calculateQuantity = (frequency: string, duration: string): string => {
    // Logique simplifiée pour calculer quantité
    const freqNum = frequency?.includes('1 fois') ? 1 : frequency?.includes('2 fois') ? 2 : frequency?.includes('3 fois') ? 3 : 2
    const durNum = duration?.includes('jours') ? parseInt(duration) || 7 : 30
    return `${freqNum * durNum} unités`
  }

  const getMauritianAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'Public': return 'bg-green-100 text-green-800'
      case 'Private': return 'bg-blue-100 text-blue-800' 
      case 'Import_Required': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getAPIStatusIcon = (med: MauritianMedication) => {
    if (med.apiVerified && med.apiNormalized) {
      return <CheckCircle className="h-4 w-4 text-green-600" />
    } else if (drugVerificationAPI.loading || rxNormAPI.loading) {
      return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
    } else if (drugVerificationAPI.error || rxNormAPI.error) {
      return <XCircle className="h-4 w-4 text-red-600" />
    }
    return null
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Alertes critiques */}
      {emergencyAlert && (
        <Alert className="border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 font-semibold">
            {emergencyAlert}
          </AlertDescription>
        </Alert>
      )}

      {/* Status API Processing */}
      {apiProcessingStep && (
        <Alert className="border-blue-500 bg-blue-50">
          <div className="flex items-center gap-2">
            {apiProcessingStep.includes("✅") ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : apiProcessingStep.includes("❌") ? (
              <XCircle className="h-4 w-4 text-red-600" />
            ) : (
              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            )}
            <AlertDescription className="text-blue-800 font-semibold">
              {apiProcessingStep}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Status APIs */}
      <Card className="border-2 border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-600" />
            Status APIs IA CHU Maurice
            <Badge variant="outline" className="ml-auto bg-purple-100 text-purple-800">
              Connexions Temps Réel
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Drug Verification API */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold">Vérification Médicaments</h3>
                {drugVerificationAPI.loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {drugVerificationAPI.success && <CheckCircle className="h-4 w-4 text-green-600" />}
                {drugVerificationAPI.error && <XCircle className="h-4 w-4 text-red-600" />}
              </div>
              <div className="text-sm">
                <div>Status: {drugVerificationAPI.loading ? 'En cours...' : drugVerificationAPI.success ? 'Connecté ✅' : drugVerificationAPI.error ? 'Erreur ❌' : 'En attente'}</div>
                {drugVerificationAPI.data && (
                  <div className="text-green-700">
                    Médicaments analysés: {drugVerificationAPI.data.data?.medications?.length || 0}
                  </div>
                )}
                {drugVerificationAPI.error && (
                  <div className="text-red-700 text-xs">{drugVerificationAPI.error}</div>
                )}
              </div>
            </div>

            {/* RxNorm API */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-green-600" />
                <h3 className="font-semibold">Normalisation RxNorm</h3>
                {rxNormAPI.loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {rxNormAPI.success && <CheckCircle className="h-4 w-4 text-green-600" />}
                {rxNormAPI.error && <XCircle className="h-4 w-4 text-red-600" />}
              </div>
              <div className="text-sm">
                <div>Status: {rxNormAPI.loading ? 'En cours...' : rxNormAPI.success ? 'Connecté ✅' : rxNormAPI.error ? 'Erreur ❌' : 'En attente'}</div>
                {rxNormAPI.data && (
                  <div className="text-green-700">
                    Normalisations: {rxNormAPI.data.filter((r: any) => r.success).length}
                  </div>
                )}
                {rxNormAPI.error && (
                  <div className="text-red-700 text-xs">{rxNormAPI.error}</div>
                )}
              </div>
            </div>
          </div>

          {/* Bouton traitement IA */}
          <div className="mt-4 text-center">
            <Button 
              onClick={processWithAI}
              disabled={drugVerificationAPI.loading || rxNormAPI.loading || mauritianMedications.filter(m => m.name.trim()).length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3"
            >
              {(drugVerificationAPI.loading || rxNormAPI.loading) ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Traitement IA en cours...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Lancer Traitement IA Complet
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuration praticien CHU Maurice */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            Praticien CHU Maurice
            <Badge variant="outline" className="ml-auto bg-blue-100 text-blue-800">
              Niveau Universitaire
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="doctorName">Nom complet</Label>
              <Input
                id="doctorName"
                value={mauritianDoctorInfo.name}
                onChange={(e) => handleDoctorChange("name", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="title">Titre académique</Label>
              <select
                id="title"
                value={mauritianDoctorInfo.title}
                onChange={(e) => handleDoctorChange("title", e.target.value)}
                className="mt-1 w-full p-2 border rounded-md"
              >
                <option value="Dr">Dr</option>
                <option value="Prof. Dr">Prof. Dr</option>
                <option value="Professeur Chef de Service">Professeur Chef de Service</option>
                <option value="Chef de Clinique">Chef de Clinique</option>
              </select>
            </div>
            <div>
              <Label htmlFor="chuAffiliation">CHU/Hôpital</Label>
              <select
                id="chuAffiliation"
                value={mauritianDoctorInfo.chuAffiliation}
                onChange={(e) => handleDoctorChange("chuAffiliation", e.target.value)}
                className="mt-1 w-full p-2 border rounded-md"
              >
                <option value="CHU Sir Seewoosagur Ramgoolam">CHU Sir Seewoosagur Ramgoolam</option>
                <option value="Dr Jeetoo Hospital">Dr Jeetoo Hospital</option>
                <option value="Wellkin Hospital">Wellkin Hospital</option>
                <option value="Apollo Bramwell">Apollo Bramwell</option>
              </select>
            </div>
            <div>
              <Label htmlFor="mauritianMedicalCouncil">N° Conseil Médical Maurice</Label>
              <Input
                id="mauritianMedicalCouncil"
                value={mauritianDoctorInfo.mauritianMedicalCouncil}
                onChange={(e) => handleDoctorChange("mauritianMedicalCouncil", e.target.value)}
                className="mt-1"
                placeholder="MMC-2024-XXXXXX"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Médicaments CHU Maurice avec IA */}
      <Card className="border-2 border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pill className="h-5 w-5 text-purple-600" />
              Médicaments CHU Maurice + IA
              <Badge variant="outline" className="bg-purple-100 text-purple-800">
                Formulaire National 2024
              </Badge>
            </div>
            <Button onClick={addMauritianMedication} size="sm" className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {mauritianMedications.map((medication, index) => (
              <div key={medication.id} className="border-2 border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg">Médicament {index + 1}</h3>
                    {getAPIStatusIcon(medication)}
                    <Badge className={getMauritianAvailabilityColor(medication.mauritianAvailability)}>
                      {medication.mauritianAvailability}
                    </Badge>
                    <Badge variant="outline">
                      Preuve {medication.evidenceLevel}
                    </Badge>
                    {medication.apiVerified && (
                      <Badge className="bg-green-100 text-green-800">IA Vérifié</Badge>
                    )}
                    {medication.apiNormalized && (
                      <Badge className="bg-blue-100 text-blue-800">Normalisé</Badge>
                    )}
                  </div>
                  {mauritianMedications.length > 1 && (
                    <Button onClick={() => removeMedication(medication.id)} variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor={`name-${medication.id}`}>Nom commercial</Label>
                    <Input
                      id={`name-${medication.id}`}
                      value={medication.name}
                      onChange={(e) => handleMedicationChange(medication.id, "name", e.target.value)}
                      placeholder="Ex: Panadol, Doliprane Maurice"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`internationalName-${medication.id}`}>DCI (nom international)</Label>
                    <Input
                      id={`internationalName-${medication.id}`}
                      value={medication.internationalName}
                      onChange={(e) => handleMedicationChange(medication.id, "internationalName", e.target.value)}
                      placeholder="Ex: Paracetamol"
                      className="mt-1"
                      disabled={medication.apiNormalized}
                    />
                  </div>

                  <div>
                    <Label htmlFor={`strength-${medication.id}`}>Dosage</Label>
                    <Input
                      id={`strength-${medication.id}`}
                      value={medication.strength}
                      onChange={(e) => handleMedicationChange(medication.id, "strength", e.target.value)}
                      placeholder="Ex: 500mg"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor={`form-${medication.id}`}>Forme galénique</Label>
                    <select
                      id={`form-${medication.id}`}
                      value={medication.form}
                      onChange={(e) => handleMedicationChange(medication.id, "form", e.target.value)}
                      className="mt-1 w-full p-2 border rounded-md"
                    >
                      {mauritianMedicationForms.map((form) => (
                        <option key={form} value={form}>{form}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor={`frequency-${medication.id}`}>Fréquence adaptée Maurice</Label>
                    <select
                      id={`frequency-${medication.id}`}
                      value={medication.frequency}
                      onChange={(e) => handleMedicationChange(medication.id, "frequency", e.target.value)}
                      className="mt-1 w-full p-2 border rounded-md"
                    >
                      <option value="">Sélectionner...</option>
                      {tropicalFrequencies.map((freq) => (
                        <option key={freq} value={freq}>{freq}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Résultats API si disponibles */}
                {medication.apiVerified && medication.verificationData && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                    <h4 className="font-semibold text-green-800 mb-2">✅ Vérification IA Complétée</h4>
                    <div className="text-sm space-y-1">
                      {medication.verificationData.contraindications?.applicable?.length > 0 && (
                        <div><strong>Précautions:</strong> {medication.verificationData.contraindications.applicable.join(', ')}</div>
                      )}
                      {medication.verificationData.monitoring?.clinicalSigns?.length > 0 && (
                        <div><strong>Surveillance:</strong> {medication.verificationData.monitoring.clinicalSigns.join(', ')}</div>
                      )}
                      {medication.verificationData.clinicalNotes?.length > 0 && (
                        <div><strong>Notes CHU:</strong> {medication.verificationData.clinicalNotes.join('; ')}</div>
                      )}
                    </div>
                  </div>
                )}

                {medication.apiNormalized && medication.normalizationData && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                    <h4 className="font-semibold text-blue-800 mb-2">🔍 Normalisation RxNorm</h4>
                    <div className="text-sm space-y-1">
                      <div><strong>DCI Standard:</strong> {medication.normalizationData.normalizedMedication?.internationalName}</div>
                      <div><strong>Statut Formulaire:</strong> {medication.normalizationData.normalizedMedication?.regulatory?.formularyStatus}</div>
                      <div><strong>Niveau Preuve:</strong> {medication.normalizationData.normalizedMedication?.evidenceLevel}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button
          onClick={generateFinalPrescription}
          disabled={mauritianMedications.filter(m => m.name.trim()).length === 0}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Award className="h-5 w-5 mr-2" />
          Générer Prescription CHU
        </Button>

        <div className="flex space-x-3">
          <Button className="bg-green-600 hover:bg-green-700">
            PDF Maurice
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700">
            Imprimer CHU
          </Button>
        </div>
      </div>
    </div>
  )
}
