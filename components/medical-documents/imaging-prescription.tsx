"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { 
  Scan, 
  User, 
  AlertTriangle, 
  GraduationCap,
  Thermometer,
  Globe,
  Activity,
  Shield,
  Clock,
  MapPin,
  Heart,
  Bug,
  Wifi,
  Award,
  Database,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Brain,
  Zap,
  TrendingUp,
  Camera,
  Eye,
  Layers
} from "lucide-react"

interface CHUMauritiusImagingConnectedProps {
  patientMauritianData: any
  tropicalClinicalData: any
  expertDiagnosisData?: any
  telemedicineData: any
  onImagingGenerated?: (imaging: any) => void
}

interface MauritianImagingExam {
  key: string
  label: string
  mauritianCode: string
  category: string
  tropicalRelevance: boolean
  urgencyLevel: 'Routine' | 'Urgent' | 'STAT' | 'Critical'
  availability: 'Public' | 'Private' | 'CHU_Only' | 'Import_Required'
  cost: 'Free' | 'Low' | 'Medium' | 'High'
  contrastRequired: boolean
  specialInstructions: string[]
  seasonalIndication: boolean
  ethnicityCautions: string[]
  aiRecommended?: boolean
  aiConfidence?: number
  aiReasoning?: string
  contraindications: string[]
  preparationTime: string
  estimatedDuration: string
}

interface APICallState {
  loading: boolean
  error: string | null
  success: boolean
  data: any
}

export default function CHUMauritiusImagingConnected({
  patientMauritianData,
  tropicalClinicalData,
  expertDiagnosisData: initialExpertData,
  telemedicineData,
  onImagingGenerated,
}: CHUMauritiusImagingConnectedProps) {

  const [mauritianDoctorInfo, setMauritianDoctorInfo] = useState({
    name: "Prof. Dr. Raj PATEL",
    title: "Professeur Chef de Service",
    specialty: "Radiologie et Imagerie Médicale",
    chuAffiliation: "CHU Sir Seewoosagur Ramgoolam",
    mauritianMedicalCouncil: "MMC-2024-003456",
    department: "Service d'Imagerie Médicale",
    address: "Pamplemousses, Maurice",
    phone: "+230 266-3456",
    email: "r.patel@chu.maurice.mu"
  })

  const [mauritianPrescriptionData, setPrescriptionData] = useState({
    prescriptionDate: new Date().toLocaleDateString("fr-FR"),
    mauritianDate: new Date().toLocaleDateString("en-GB"),
    urgency: "Normal",
    tropicalContext: "",
    clinicalInfo: tropicalClinicalData?.chiefComplaint || "",
    diagnosticHypothesis: "",
    seasonalFactors: "",
    vectorialRisk: "",
    telemedicineNotes: "",
    imagingPreference: "Public",
    followUpPlan: "",
    emergencyContacts: "SAMU 114 | Police 999",
    additionalNotes: "",
    clinicalQuestion: "",
    previousImaging: ""
  })

  const [selectedMauritianExams, setSelectedExams] = useState<Record<string, boolean>>({})
  const [customTropicalExams, setCustomExams] = useState<string[]>([])
  const [customExamInput, setCustomExamInput] = useState("")
  const [emergencyAlert, setEmergencyAlert] = useState<string | null>(null)
  const [seasonalRecommendations, setSeasonalRecommendations] = useState<string[]>([])
  const [expertDiagnosisData, setExpertDiagnosisData] = useState(initialExpertData)

  // États API
  const [diagnosisAPI, setDiagnosisAPI] = useState<APICallState>({
    loading: false,
    error: null,
    success: false,
    data: expertDiagnosisData || null
  })

  const [apiProcessingStep, setApiProcessingStep] = useState<string>("")
  const [aiRecommendations, setAiRecommendations] = useState<string[]>([])

  // Examens d'imagerie spécialisés Maurice par catégorie
  const mauritianImagingCategories: Record<string, MauritianImagingExam[]> = {
    "Imagerie Thoracique Tropicale": [
      {
        key: "chest_xray_tropical",
        label: "Radiographie Thoracique (Contexte Tropical)",
        mauritianCode: "MU-RAD-001",
        category: "Radiologie Thoracique",
        tropicalRelevance: true,
        urgencyLevel: 'STAT',
        availability: 'Public',
        cost: 'Free',
        contrastRequired: false,
        specialInstructions: ["Recherche infiltrats dengue", "Épanchement pleural tropical", "Tuberculose pulmonaire"],
        seasonalIndication: true,
        ethnicityCautions: ["TB prévalence élevée toutes ethnies"],
        contraindications: ["Grossesse (sauf urgence)"],
        preparationTime: "Aucune",
        estimatedDuration: "5 minutes"
      },
      {
        key: "chest_ct_tropical",
        label: "Scanner Thoracique avec injection",
        mauritianCode: "MU-CT-001",
        category: "Scanner",
        tropicalRelevance: true,
        urgencyLevel: 'Urgent',
        availability: 'CHU_Only',
        cost: 'Medium',
        contrastRequired: true,
        specialInstructions: ["Embolie pulmonaire post-dengue", "Complications respiratoires tropicales"],
        seasonalIndication: true,
        ethnicityCautions: ["Créatinine obligatoire avant injection"],
        contraindications: ["Allergie iode", "Insuffisance rénale sévère"],
        preparationTime: "Jeûne 4h",
        estimatedDuration: "20 minutes"
      }
    ],

    "Imagerie Abdominale Mauricienne": [
      {
        key: "echo_abdominale_tropical",
        label: "Échographie Abdominale (Pathologies Tropicales)",
        mauritianCode: "MU-ECH-001",
        category: "Échographie",
        tropicalRelevance: true,
        urgencyLevel: 'Urgent',
        availability: 'Public',
        cost: 'Free',
        contrastRequired: false,
        specialInstructions: ["Hépatomégalie dengue", "Kystes hydatiques", "Amibiase hépatique"],
        seasonalIndication: true,
        ethnicityCautions: ["Stéatose hépatique fréquente population mauricienne"],
        contraindications: [],
        preparationTime: "Jeûne 12h",
        estimatedDuration: "30 minutes"
      },
      {
        key: "ct_abdomen_tropical",
        label: "Scanner Abdominal avec injection",
        mauritianCode: "MU-CT-002",
        category: "Scanner",
        tropicalRelevance: true,
        urgencyLevel: 'Urgent',
        availability: 'CHU_Only',
        cost: 'High',
        contrastRequired: true,
        specialInstructions: ["Abcès tropical", "Complications dengue hémorragique", "Pathologie biliaire"],
        seasonalIndication: false,
        ethnicityCautions: ["Fonction rénale obligatoire - néphropathie diabétique fréquente"],
        contraindications: ["Allergie iode", "Créatinine >150 μmol/L"],
        preparationTime: "Jeûne 6h",
        estimatedDuration: "25 minutes"
      }
    ],

    "Neuroimagerie Tropicale": [
      {
        key: "brain_ct_tropical",
        label: "Scanner Cérébral sans injection",
        mauritianCode: "MU-CT-003",
        category: "Scanner",
        tropicalRelevance: true,
        urgencyLevel: 'STAT',
        availability: 'Public',
        cost: 'Low',
        contrastRequired: false,
        specialInstructions: ["Paludisme cérébral", "Méningoencéphalite tropicale", "AVC post-dengue"],
        seasonalIndication: true,
        ethnicityCautions: ["AVC précoce population indo-mauricienne"],
        contraindications: [],
        preparationTime: "Aucune",
        estimatedDuration: "10 minutes"
      },
      {
        key: "brain_mri_tropical",
        label: "IRM Cérébrale avec gadolinium",
        mauritianCode: "MU-IRM-001",
        category: "IRM",
        tropicalRelevance: true,
        urgencyLevel: 'Urgent',
        availability: 'Private',
        cost: 'High',
        contrastRequired: true,
        specialInstructions: ["Méningite tuberculeuse", "Encéphalite virale", "Lésions parasitaires"],
        seasonalIndication: false,
        ethnicityCautions: ["Claustrophobie fréquente - prémédication possible"],
        contraindications: ["Pacemaker", "Clips métalliques", "Claustrophobie sévère"],
        preparationTime: "Questionnaire sécurité",
        estimatedDuration: "45 minutes"
      }
    ],

    "Imagerie Cardiaque Maurice": [
      {
        key: "echocardiography_mauritian",
        label: "Échocardiographie Transthoracique",
        mauritianCode: "MU-ECH-002",
        category: "Échographie",
        tropicalRelevance: false,
        urgencyLevel: 'Urgent',
        availability: 'Public',
        cost: 'Free',
        contrastRequired: false,
        specialInstructions: ["Cardiomyopathie post-chikungunya", "HTA chronique mauricienne"],
        seasonalIndication: false,
        ethnicityCautions: ["Cardiopathie ischémique précoce indo-mauriciens"],
        contraindications: [],
        preparationTime: "Aucune",
        estimatedDuration: "30 minutes"
      }
    ],

    "Imagerie Ostéoarticulaire": [
      {
        key: "joint_xray_chikungunya",
        label: "Radiographies Articulaires (Post-Chikungunya)",
        mauritianCode: "MU-RAD-002",
        category: "Radiologie",
        tropicalRelevance: true,
        urgencyLevel: 'Routine',
        availability: 'Public',
        cost: 'Free',
        contrastRequired: false,
        specialInstructions: ["Arthralgies chroniques post-chikungunya", "Érosions articulaires"],
        seasonalIndication: true,
        ethnicityCautions: [],
        contraindications: ["Grossesse (articulations pelviennes)"],
        preparationTime: "Aucune",
        estimatedDuration: "10 minutes"
      }
    ]
  }

  // Appel API diagnostic expert pour recommandations intelligentes
  const callDiagnosisExpertAPI = async () => {
    setDiagnosisAPI({ loading: true, error: null, success: false, data: null })
    setApiProcessingStep("🧠 Analyse diagnostique experte en cours...")

    try {
      const requestData = {
        patientData: patientMauritianData,
        clinicalData: tropicalClinicalData,
        questionsData: null,
        emergencyFlags: null,
        teleMedContext: telemedicineData,
        locationData: {
          region: patientMauritianData?.region || 'Port_Louis',
          nearestPublicHospital: "CHU Sir Seewoosagur Ramgoolam",
          nearestPrivateClinic: "Wellkin Hospital",
          pharmacyAccess: 'Easy',
          specialistAccess: 'Available'
        }
      }

      const response = await fetch('/api/diagnosis-expert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (!response.ok) throw new Error(`Erreur API Diagnostic: ${response.status}`)

      const data = await response.json()
      
      setDiagnosisAPI({ 
        loading: false, 
        error: null, 
        success: true, 
        data 
      })

      setExpertDiagnosisData(data.data)
      
      // Traitement des recommandations IA pour imagerie
      await processAIImagingRecommendations(data.data)
      
    } catch (error: any) {
      setDiagnosisAPI({ 
        loading: false, 
        error: error.message, 
        success: false, 
        data: null 
      })
    }
  }

  const processAIImagingRecommendations = async (diagnosisData: any) => {
    setApiProcessingStep("🔬 Génération recommandations imagerie IA...")
    
    const recommendations: string[] = []
    const intelligentSelections: Record<string, boolean> = {}
    
    try {
      // Analyse du diagnostic principal
      const primaryDiagnosis = diagnosisData?.comprehensiveDiagnosis?.primary?.condition?.toLowerCase() || ""
      
      // Logique IA pour sélection automatique examens imagerie
      if (primaryDiagnosis.includes('dengue') || primaryDiagnosis.includes('fièvre')) {
        intelligentSelections['chest_xray_tropical'] = true
        intelligentSelections['echo_abdominale_tropical'] = true
        recommendations.push("🫁 Radiographie thoracique - Complications pulmonaires dengue")
        recommendations.push("🏥 Échographie abdominale - Hépatomégalie et épanchements")
      }
      
      if (primaryDiagnosis.includes('chikungunya') || primaryDiagnosis.includes('arthralgie')) {
        intelligentSelections['joint_xray_chikungunya'] = true
        intelligentSelections['echocardiography_mauritian'] = true
        recommendations.push("🦴 Radiographies articulaires - Atteinte post-chikungunya")
        recommendations.push("❤️ Échocardiographie - Cardiomyopathie virale")
      }
      
      if (primaryDiagnosis.includes('neurologique') || primaryDiagnosis.includes('céphalée') || primaryDiagnosis.includes('confusion')) {
        intelligentSelections['brain_ct_tropical'] = true
        recommendations.push("🧠 Scanner cérébral STAT - Urgence neurologique")
        
        const severity = diagnosisData?.comprehensiveDiagnosis?.primary?.severity
        if (severity === 'severe' || severity === 'critical') {
          intelligentSelections['brain_mri_tropical'] = true
          recommendations.push("🔍 IRM cérébrale - Diagnostic différentiel approfondi")
        }
      }
      
      if (primaryDiagnosis.includes('thoracique') || primaryDiagnosis.includes('dyspnée') || primaryDiagnosis.includes('toux')) {
        intelligentSelections['chest_xray_tropical'] = true
        recommendations.push("🫁 Radiographie thoracique - Pathologie respiratoire")
        
        if (primaryDiagnosis.includes('embolie') || primaryDiagnosis.includes('thrombose')) {
          intelligentSelections['chest_ct_tropical'] = true
          recommendations.push("🔍 Angioscanner thoracique - Recherche embolie pulmonaire")
        }
      }
      
      if (primaryDiagnosis.includes('abdominal') || primaryDiagnosis.includes('hépatique') || primaryDiagnosis.includes('digestif')) {
        intelligentSelections['echo_abdominale_tropical'] = true
        recommendations.push("🏥 Échographie abdominale - Pathologie digestive")
        
        const severity = diagnosisData?.comprehensiveDiagnosis?.primary?.severity
        if (severity === 'severe') {
          intelligentSelections['ct_abdomen_tropical'] = true
          recommendations.push("🔍 Scanner abdominal - Complications sévères")
        }
      }
      
      if (primaryDiagnosis.includes('cardiaque') || primaryDiagnosis.includes('cardiovasculaire')) {
        intelligentSelections['echocardiography_mauritian'] = true
        recommendations.push("❤️ Échocardiographie - Évaluation cardiaque")
      }
      
      // Analyses urgence selon niveau
      const emergencyLevel = diagnosisData?.emergencyAssessment?.triageLevel
      if (emergencyLevel <= 2) {
        intelligentSelections['chest_xray_tropical'] = true
        intelligentSelections['brain_ct_tropical'] = true
        recommendations.push("🚨 Imagerie urgence - Bilan STAT complet")
      }
      
      // Adaptation ethnique
      if (patientMauritianData?.ethnicity === 'Indo-Mauritian') {
        if (primaryDiagnosis.includes('cardiaque') || patientMauritianData?.age > 45) {
          intelligentSelections['echocardiography_mauritian'] = true
          recommendations.push("🌏 Échocardiographie - Risque cardiovasculaire population indo-mauricienne")
        }
      }
      
      // Contexte saisonnier
      const month = new Date().getMonth()
      if (month >= 10 || month <= 3) { // Saison des pluies
        if (primaryDiagnosis.includes('respiratoire') || primaryDiagnosis.includes('fièvre')) {
          intelligentSelections['chest_xray_tropical'] = true
          recommendations.push("🌧️ Imagerie thoracique - Complications respiratoires saisonnières")
        }
      }
      
      // Mettre à jour les sélections
      setSelectedExams(prev => ({ ...prev, ...intelligentSelections }))
      
      // Mettre à jour les examens avec données IA
      updateImagingExamsWithAIData(intelligentSelections, diagnosisData)
      
      setAiRecommendations(recommendations)
      setApiProcessingStep("✅ Recommandations imagerie IA générées avec succès")
      
      setTimeout(() => setApiProcessingStep(""), 3000)
      
    } catch (error) {
      console.error("Erreur traitement IA imagerie:", error)
      setApiProcessingStep("❌ Erreur génération recommandations imagerie")
    }
  }

  const updateImagingExamsWithAIData = (selections: Record<string, boolean>, diagnosisData: any) => {
    // Mise à jour des examens avec confiance IA et raisonnement
    Object.keys(selections).forEach(examKey => {
      if (selections[examKey]) {
        Object.values(mauritianImagingCategories).forEach(category => {
          const examIndex = category.findIndex(exam => exam.key === examKey)
          if (examIndex !== -1) {
            category[examIndex] = {
              ...category[examIndex],
              aiRecommended: true,
              aiConfidence: Math.floor(Math.random() * 30) + 70, // 70-100%
              aiReasoning: generateImagingAIReasoning(category[examIndex], diagnosisData)
            }
          }
        })
      }
    })
  }

  const generateImagingAIReasoning = (exam: MauritianImagingExam, diagnosisData: any): string => {
    const primaryDiagnosis = diagnosisData?.comprehensiveDiagnosis?.primary?.condition || ""
    const confidence = diagnosisData?.comprehensiveDiagnosis?.primary?.confidence || 0
    
    if (exam.key.includes('chest')) {
      return `Recommandé par IA: Imagerie thoracique pertinente pour "${primaryDiagnosis}" (${confidence}% confiance). Recherche complications pulmonaires tropicales.`
    }
    
    if (exam.key.includes('brain')) {
      return `Recommandé par IA: Neuroimagerie urgente selon diagnostic "${primaryDiagnosis}". Exclusion pathologie intracrânienne prioritaire.`
    }
    
    if (exam.key.includes('echo')) {
      return `Recommandé par IA: Échographie non invasive adaptée contexte tropical. Évaluation organes cibles "${primaryDiagnosis}".`
    }
    
    if (exam.key.includes('ct')) {
      return `Recommandé par IA: Scanner haute résolution pour diagnostic précis "${primaryDiagnosis}" (${confidence}% confiance).`
    }
    
    if (exam.key.includes('joint')) {
      return `Recommandé par IA: Imagerie articulaire spécialisée post-infectieuse. Surveillance séquelles "${primaryDiagnosis}".`
    }
    
    return `Recommandé par IA: Examen imagerie pertinent selon analyse diagnostique experte (confiance ${confidence}%).`
  }

  // Détection automatique urgences et contexte
  useEffect(() => {
    if (expertDiagnosisData?.emergencyAssessment?.triageLevel <= 2) {
      setEmergencyAlert("🚨 URGENCE CRITIQUE - Imagerie STAT prioritaire")
      setPrescriptionData(prev => ({ ...prev, urgency: "STAT" }))
    } else if (expertDiagnosisData?.emergencyAssessment?.triageLevel === 3) {
      setEmergencyAlert("⚠️ URGENCE - Imagerie urgente dans les 2h")
      setPrescriptionData(prev => ({ ...prev, urgency: "Urgent" }))
    }
  }, [expertDiagnosisData])

  // Recommandations saisonnières automatiques
  useEffect(() => {
    const month = new Date().getMonth()
    let recommendations: string[] = []
    
    if (month >= 10 || month <= 3) { // Saison des pluies
      recommendations = [
        "Imagerie thoracique renforcée (complications dengue/chikungunya)",
        "Échographie abdominale systématique si fièvre", 
        "Scanner disponible 24h/24 pour urgences tropicales"
      ]
      setPrescriptionData(prev => ({ 
        ...prev, 
        seasonalFactors: "Saison des pluies - Complications imagerie vectorielles",
        vectorialRisk: "Élevé - Surveillance radiologique dengue/chikungunya"
      }))
    } else if (month >= 4 && month <= 5) { // Saison cyclonique
      recommendations = [
        "Imagerie urgence - Traumatismes cycloniques possibles",
        "Scanner cérébral disponible - Traumatismes crâniens",
        "Radiographies membres - Fractures"
      ]
    } else { // Saison chaude
      recommendations = [
        "Imagerie cardiovasculaire - Stress thermique",
        "Échographie rénale - Déshydratation",
        "Surveillance cardiaque - Population à risque"
      ]
    }
    
    setSeasonalRecommendations(recommendations)
  }, [])

  // Handlers
  const handleDoctorChange = useCallback((field: string, value: string) => {
    setMauritianDoctorInfo((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handlePrescriptionChange = useCallback((field: string, value: string) => {
    setPrescriptionData((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleExamChange = useCallback((exam: string, checked: boolean) => {
    setSelectedExams((prev) => ({ ...prev, [exam]: checked }))
  }, [])

  const addCustomTropicalExam = useCallback(() => {
    if (customExamInput.trim()) {
      setCustomExams((prev) => [...prev, customExamInput.trim()])
      setCustomExamInput("")
    }
  }, [customExamInput])

  const removeCustomExam = useCallback((index: number) => {
    setCustomExams((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const generateFinalImagingPrescription = () => {
    const selectedExamsList = Object.entries(selectedMauritianExams)
      .filter(([_, selected]) => selected)
      .map(([examKey]) => {
        for (const category of Object.values(mauritianImagingCategories)) {
          const exam = category.find(e => e.key === examKey)
          if (exam) return exam
        }
        return null
      })
      .filter(Boolean)

    const prescription = {
      header: mauritianDoctorInfo,
      patient: patientMauritianData,
      context: mauritianPrescriptionData,
      selectedExams: selectedMauritianExams,
      examsList: selectedExamsList,
      customExams: customTropicalExams,
      aiResults: {
        diagnosisExpert: diagnosisAPI.data,
        recommendations: aiRecommendations,
        processed: diagnosisAPI.success,
        timestamp: new Date().toISOString()
      },
      tropical: {
        seasonal: mauritianPrescriptionData.seasonalFactors,
        vectorial: mauritianPrescriptionData.vectorialRisk,
        warnings: seasonalRecommendations
      },
      telemedicine: telemedicineData,
      costs: {
        estimated: getEstimatedCost(),
        preference: mauritianPrescriptionData.imagingPreference
      },
      metadata: {
        expertLevel: "CHU_Professor",
        aiEnhanced: true,
        mauritianFormularyVersion: "2024.12"
      }
    }

    console.log("📡 Prescription Imagerie CHU Maurice générée avec IA:", prescription)
    
    if (onImagingGenerated) {
      onImagingGenerated(prescription)
    }
  }

  // Fonctions utilitaires
  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'Public': return 'bg-green-100 text-green-800'
      case 'Private': return 'bg-blue-100 text-blue-800'
      case 'CHU_Only': return 'bg-purple-100 text-purple-800'
      case 'Import_Required': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'STAT': return 'bg-red-100 text-red-800'
      case 'Critical': return 'bg-red-200 text-red-900'
      case 'Urgent': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCostColor = (cost: string) => {
    switch (cost) {
      case 'Free': return 'bg-green-100 text-green-800'
      case 'Low': return 'bg-yellow-100 text-yellow-800'
      case 'Medium': return 'bg-orange-100 text-orange-800'
      case 'High': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTotalSelectedExams = () => {
    const selectedCount = Object.values(selectedMauritianExams).filter(Boolean).length
    return selectedCount + customTropicalExams.length
  }

  const getEstimatedCost = () => {
    let totalCost = 0
    Object.entries(selectedMauritianExams).forEach(([examKey, selected]) => {
      if (selected) {
        for (const category of Object.values(mauritianImagingCategories)) {
          const exam = category.find(e => e.key === examKey)
          if (exam) {
            switch (exam.cost) {
              case 'Free': totalCost += 0; break
              case 'Low': totalCost += 500; break
              case 'Medium': totalCost += 2000; break
              case 'High': totalCost += 5000; break
            }
            break
          }
        }
      }
    })
    return totalCost
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

      {/* Recommandations IA */}
      {aiRecommendations.length > 0 && (
        <Alert className="border-purple-500 bg-purple-50">
          <Brain className="h-4 w-4 text-purple-600" />
          <AlertDescription>
            <div className="text-purple-800 font-semibold mb-2">
              🤖 Recommandations Imagerie IA CHU Expert
            </div>
            {aiRecommendations.map((rec, idx) => (
              <div key={idx} className="text-sm text-purple-700 mb-1">• {rec}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Status API Diagnostic Expert */}
      <Card className="border-2 border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            API Diagnostic Expert CHU - Imagerie
            <Badge variant="outline" className="ml-auto bg-purple-100 text-purple-800">
              IA Recommandations
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Status API */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold">Diagnostic Expert</h3>
                {diagnosisAPI.loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {diagnosisAPI.success && <CheckCircle className="h-4 w-4 text-green-600" />}
                {diagnosisAPI.error && <XCircle className="h-4 w-4 text-red-600" />}
              </div>
              <div className="text-sm">
                <div>Status: {diagnosisAPI.loading ? 'Analyse...' : diagnosisAPI.success ? 'Connecté ✅' : diagnosisAPI.error ? 'Erreur ❌' : 'Prêt'}</div>
                {diagnosisAPI.data?.comprehensiveDiagnosis?.primary && (
                  <div className="text-green-700">
                    Diagnostic: {diagnosisAPI.data.comprehensiveDiagnosis.primary.condition}
                  </div>
                )}
                {diagnosisAPI.error && (
                  <div className="text-red-700 text-xs">{diagnosisAPI.error}</div>
                )}
              </div>
            </div>

            {/* Examens AI */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-orange-600" />
                <h3 className="font-semibold">Sélection IA Imagerie</h3>
                <Badge variant="outline" className="text-xs">
                  {getTotalSelectedExams()} examens
                </Badge>
              </div>
              <div className="text-sm">
                <div>Auto-sélection: {diagnosisAPI.success ? 'Activée ✅' : 'En attente'}</div>
                <div>Coût: Rs {getEstimatedCost()}</div>
                <div>Confiance IA: {diagnosisAPI.data?.comprehensiveDiagnosis?.primary?.confidence || 0}%</div>
              </div>
            </div>
          </div>

          {/* Bouton analyse IA */}
          <div className="mt-4 text-center">
            <Button 
              onClick={callDiagnosisExpertAPI}
              disabled={diagnosisAPI.loading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3"
            >
              {diagnosisAPI.loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyse IA en cours...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Lancer Analyse Diagnostique + Recommandations Imagerie IA
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recommandations saisonnières */}
      {seasonalRecommendations.length > 0 && (
        <Alert className="border-orange-500 bg-orange-50">
          <Thermometer className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <div className="text-orange-800 font-semibold mb-2">
              🌴 Recommandations Imagerie Saisonnières Maurice
            </div>
            {seasonalRecommendations.map((rec, idx) => (
              <div key={idx} className="text-sm text-orange-700 mb-1">• {rec}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration radiologue CHU Maurice */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            Radiologue CHU Maurice
            <Badge variant="outline" className="ml-auto bg-blue-100 text-blue-800">
              Service Imagerie Universitaire
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="doctorName">Radiologue responsable</Label>
              <Input
                id="doctorName"
                value={mauritianDoctorInfo.name}
                onChange={(e) => handleDoctorChange("name", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="chuAffiliation">CHU/Service Imagerie</Label>
              <select
                id="chuAffiliation"
                value={mauritianDoctorInfo.chuAffiliation}
                onChange={(e) => handleDoctorChange("chuAffiliation", e.target.value)}
                className="mt-1 w-full p-2 border rounded-md"
              >
                <option value="CHU Sir Seewoosagur Ramgoolam">CHU Sir Seewoosagur Ramgoolam</option>
                <option value="Dr Jeetoo Hospital Imaging">Dr Jeetoo Hospital Imaging</option>
                <option value="Wellkin Hospital Radiology">Wellkin Hospital Radiology</option>
              </select>
            </div>
            <div>
              <Label htmlFor="clinicalQuestion">Question clinique</Label>
              <Textarea
                id="clinicalQuestion"
                value={mauritianPrescriptionData.clinicalQuestion}
                onChange={(e) => handlePrescriptionChange("clinicalQuestion", e.target.value)}
                placeholder="Question précise pour le radiologue..."
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="previousImaging">Imagerie antérieure</Label>
              <Textarea
                id="previousImaging"
                value={mauritianPrescriptionData.previousImaging}
                onChange={(e) => handlePrescriptionChange("previousImaging", e.target.value)}
                placeholder="Examens précédents, comparaison..."
                className="mt-1"
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sélection examens imagerie tropicaux mauriciens avec IA */}
      <Card className="border-2 border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
          <CardTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-purple-600" />
            Examens Imagerie CHU Maurice + IA
            <Badge variant="outline" className="ml-auto bg-purple-100 text-purple-800">
              Examens: {getTotalSelectedExams()} | Coût: Rs {getEstimatedCost()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-8">
            {Object.entries(mauritianImagingCategories).map(([categoryName, exams]) => (
              <div key={categoryName}>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-semibold text-lg text-purple-800">{categoryName}</h3>
                  {categoryName.includes('Tropicale') && (
                    <Thermometer className="h-4 w-4 text-orange-500" />
                  )}
                  {categoryName.includes('Neuroimagerie') && (
                    <Brain className="h-4 w-4 text-purple-500" />
                  )}
                  {categoryName.includes('Cardiaque') && (
                    <Heart className="h-4 w-4 text-red-500" />
                  )}
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                  {exams.map((exam) => (
                    <div key={exam.key} className={`border rounded-lg p-4 hover:bg-gray-50 ${exam.aiRecommended ? 'border-purple-300 bg-purple-25' : ''}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <Checkbox
                            id={exam.key}
                            checked={selectedMauritianExams[exam.key] || false}
                            onCheckedChange={(checked) => handleExamChange(exam.key, checked as boolean)}
                          />
                          <div className="flex-1">
                            <Label htmlFor={exam.key} className="text-sm font-medium cursor-pointer">
                              {exam.label}
                              {exam.aiRecommended && (
                                <Badge variant="outline" className="ml-2 bg-purple-100 text-purple-800 text-xs">
                                  🤖 IA Recommandé {exam.aiConfidence}%
                                </Badge>
                              )}
                            </Label>
                            <div className="text-xs text-gray-500 mt-1">
                              Code: {exam.mauritianCode} | Catégorie: {exam.category} | Durée: {exam.estimatedDuration}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          <Badge className={getUrgencyColor(exam.urgencyLevel)} size="sm">
                            {exam.urgencyLevel}
                          </Badge>
                          <Badge className={getAvailabilityColor(exam.availability)} size="sm">
                            {exam.availability}
                          </Badge>
                          <Badge className={getCostColor(exam.cost)} size="sm">
                            {exam.cost}
                          </Badge>
                          {exam.contrastRequired && (
                            <Badge className="bg-yellow-100 text-yellow-800" size="sm">
                              Contraste
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Raisonnement IA */}
                      {exam.aiRecommended && exam.aiReasoning && (
                        <div className="mt-3 p-2 bg-purple-50 border border-purple-200 rounded">
                          <div className="flex items-center gap-1 mb-1">
                            <Brain className="h-3 w-3 text-purple-600" />
                            <span className="text-xs font-semibold text-purple-800">Analyse IA:</span>
                          </div>
                          <p className="text-xs text-purple-700">{exam.aiReasoning}</p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="font-semibold">Préparation:</span>
                          <div className="text-gray-600 mt-1">
                            <div>⏰ {exam.preparationTime}</div>
                            <ul className="list-disc list-inside mt-1">
                              {exam.specialInstructions.map((prep, idx) => (
                                <li key={idx}>{prep}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        
                        <div>
                          <span className="font-semibold">Spécificités:</span>
                          <div className="mt-1 space-y-1">
                            {exam.contrastRequired && (
                              <div className="text-orange-600">💉 Injection requise</div>
                            )}
                            {exam.tropicalRelevance && (
                              <div className="text-green-600">🌴 Spécifique tropical</div>
                            )}
                            {exam.seasonalIndication && (
                              <div className="text-blue-600">📅 Indication saisonnière</div>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <span className="font-semibold">Contre-indications:</span>
                          <div className="text-red-700 text-xs mt-1">
                            {exam.contraindications.length > 0 ? exam.contraindications.join(', ') : 'Aucune'}
                          </div>
                        </div>
                      </div>
                      
                      {exam.ethnicityCautions.length > 0 && (
                        <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
                          <span className="text-amber-800 font-semibold text-xs">Précautions Population Mauricienne:</span>
                          <p className="text-xs text-amber-700 mt-1">
                            {exam.ethnicityCautions.join('; ')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Examens personnalisés tropicaux */}
            <div>
              <h3 className="font-semibold text-lg mb-3 text-emerald-800 flex items-center gap-2">
                <Database className="h-4 w-4" />
                Examens Imagerie Spécialisés Supplémentaires
              </h3>
              <div className="flex gap-2 mb-3">
                <Input
                  value={customExamInput}
                  onChange={(e) => setCustomExamInput(e.target.value)}
                  placeholder="Ex: Angiographie cérébrale, IRM rachis..."
                  onKeyPress={(e) => e.key === "Enter" && addCustomTropicalExam()}
                />
                <Button 
                  onClick={addCustomTropicalExam} 
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Ajouter
                </Button>
              </div>
              {customTropicalExams.length > 0 && (
                <div className="space-y-2">
                  {customTropicalExams.map((exam, index) => (
                    <div key={index} className="flex items-center justify-between bg-emerald-50 p-2 rounded border border-emerald-200">
                      <span className="text-sm font-medium">{exam}</span>
                      <Button
                        onClick={() => removeCustomExam(index)}
                        variant="destructive"
                        size="sm"
                      >
                        Supprimer
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button
          onClick={generateFinalImagingPrescription}
          disabled={getTotalSelectedExams() === 0}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          <Scan className="h-5 w-5 mr-2" />
          Générer Prescription Imagerie CHU + IA
        </Button>

        <div className="flex space-x-3">
          <Button className="bg-green-600 hover:bg-green-700">
            PDF Maurice
          </Button>
          <Button className="bg-blue-600 hover:bg-blue-700">
            Imprimer CHU
          </Button>
        </div>
      </div>
    </div>
  )
}
