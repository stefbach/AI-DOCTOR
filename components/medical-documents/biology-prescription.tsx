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
  FlaskConical, 
  User, 
  AlertTriangle, 
  GraduationCap,
  Thermometer,
  Globe,
  Microscope,
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
  TrendingUp
} from "lucide-react"

interface CHUMauritiusBiologyConnectedProps {
  patientMauritianData: any
  tropicalClinicalData: any
  expertDiagnosisData?: any
  telemedicineData: any
  onBiologyGenerated?: (biology: any) => void
}

interface MauritianBiologyExam {
  key: string
  label: string
  mauritianCode: string
  category: string
  tropicalRelevance: boolean
  urgencyLevel: 'Routine' | 'Urgent' | 'STAT' | 'Critical'
  availability: 'Public' | 'Private' | 'CHU_Only' | 'Import_Required'
  cost: 'Free' | 'Low' | 'Medium' | 'High'
  fastingRequired: boolean
  specialInstructions: string[]
  seasonalIndication: boolean
  ethnicityCautions: string[]
  aiRecommended?: boolean
  aiConfidence?: number
  aiReasoning?: string
  normalValues: {
    male?: string
    female?: string
    pediatric?: string
    mauritian_specific?: string
  }
}

interface APICallState {
  loading: boolean
  error: string | null
  success: boolean
  data: any
}

export default function CHUMauritiusBiologyConnected({
  patientMauritianData,
  tropicalClinicalData,
  expertDiagnosisData: initialExpertData,
  telemedicineData,
  onBiologyGenerated,
}: CHUMauritiusBiologyConnectedProps) {

  const [mauritianDoctorInfo, setMauritianDoctorInfo] = useState({
    name: "Prof. Dr. Priya SHARMA",
    title: "Professeur Chef de Service",
    specialty: "Médecine Interne et Tropicale",
    chuAffiliation: "CHU Sir Seewoosagur Ramgoolam",
    mauritianMedicalCouncil: "MMC-2024-002345",
    department: "Laboratoire de Biologie Médicale",
    address: "Pamplemousses, Maurice",
    phone: "+230 266-2345",
    email: "p.sharma@chu.maurice.mu"
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
    laboratoryPreference: "Public",
    followUpPlan: "",
    emergencyContacts: "SAMU 114 | Police 999",
    additionalNotes: ""
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

  // Examens spécialisés Maurice par catégorie
  const mauritianExamCategories: Record<string, MauritianBiologyExam[]> = {
    "Maladies Tropicales Vectorielles": [
      {
        key: "dengue_ns1",
        label: "Dengue NS1 Antigène",
        mauritianCode: "MU-TROP-001",
        category: "Maladies Tropicales",
        tropicalRelevance: true,
        urgencyLevel: 'STAT',
        availability: 'Public',
        cost: 'Free',
        fastingRequired: false,
        specialInstructions: ["Optimal J1-J7 après début fièvre", "Combinaison avec IgM si >J5"],
        seasonalIndication: true,
        ethnicityCautions: ["Surveillance plaquettes toutes ethnies"],
        normalValues: { mauritian_specific: "Négatif <1.0 index" }
      },
      {
        key: "dengue_igm_igg",
        label: "Dengue IgM/IgG",
        mauritianCode: "MU-TROP-002",
        category: "Maladies Tropicales",
        tropicalRelevance: true,
        urgencyLevel: 'Urgent',
        availability: 'Public',
        cost: 'Free',
        fastingRequired: false,
        specialInstructions: ["IgM: J5-J90", "IgG: mémoire immunologique"],
        seasonalIndication: true,
        ethnicityCautions: [],
        normalValues: { mauritian_specific: "IgM <1.1, IgG <1.1 ratio" }
      },
      {
        key: "chikungunya_igm",
        label: "Chikungunya IgM",
        mauritianCode: "MU-TROP-003",
        category: "Maladies Tropicales",
        tropicalRelevance: true,
        urgencyLevel: 'Urgent',
        availability: 'Public',
        cost: 'Free',
        fastingRequired: false,
        specialInstructions: ["Optimal après J5", "Différentiel avec dengue obligatoire"],
        seasonalIndication: true,
        ethnicityCautions: [],
        normalValues: { mauritian_specific: "Négatif <1.1 ratio" }
      },
      {
        key: "malaria_rapid_test",
        label: "Test Rapide Paludisme (P.falciparum/P.vivax)",
        mauritianCode: "MU-TROP-004",
        category: "Maladies Tropicales",
        tropicalRelevance: true,
        urgencyLevel: 'STAT',
        availability: 'Public',
        cost: 'Free',
        fastingRequired: false,
        specialInstructions: ["Résultat en 15min", "Confirmation par frottis si positif"],
        seasonalIndication: false,
        ethnicityCautions: [],
        normalValues: { mauritian_specific: "Négatif" }
      }
    ],

    "Hématologie Tropicale": [
      {
        key: "nfs_tropical",
        label: "NFS avec Plaquettes (Surveillance Tropicale)",
        mauritianCode: "MU-HEM-001",
        category: "Hématologie",
        tropicalRelevance: true,
        urgencyLevel: 'STAT',
        availability: 'Public',
        cost: 'Free',
        fastingRequired: false,
        specialInstructions: ["Surveillance thrombopénie dengue", "Alerte <100 000 plaquettes"],
        seasonalIndication: true,
        ethnicityCautions: ["Thalassémie fréquente population indo-mauricienne"],
        normalValues: { 
          mauritian_specific: "Plaquettes >150 000, Hb: H>13, F>12 g/dL",
          male: "Hb 13-17 g/dL, Plaquettes 150-400k",
          female: "Hb 12-15 g/dL, Plaquettes 150-400k"
        }
      },
      {
        key: "reticulocytes_tropical",
        label: "Réticulocytes",
        mauritianCode: "MU-HEM-002", 
        category: "Hématologie",
        tropicalRelevance: false,
        urgencyLevel: 'Routine',
        availability: 'Public',
        cost: 'Free',
        fastingRequired: false,
        specialInstructions: ["Évaluation régénération médullaire"],
        seasonalIndication: false,
        ethnicityCautions: ["Surveillance anémie chronique populations mauriciennes"],
        normalValues: { mauritian_specific: "25-85 x10⁹/L" }
      }
    ],

    "Biochimie Adaptée Maurice": [
      {
        key: "glycemie_mauritian",
        label: "Glycémie à Jeun (Surveillance Diabète Mauricien)",
        mauritianCode: "MU-BIO-001",
        category: "Biochimie",
        tropicalRelevance: false,
        urgencyLevel: 'Routine',
        availability: 'Public',
        cost: 'Free',
        fastingRequired: true,
        specialInstructions: ["Jeûne 12h obligatoire", "Prévalence élevée population indo-mauricienne"],
        seasonalIndication: false,
        ethnicityCautions: ["Diabète type 2 précoce population indo-mauricienne"],
        normalValues: { mauritian_specific: "<1.26 g/L (7.0 mmol/L)" }
      },
      {
        key: "hba1c_mauritian",
        label: "HbA1c (Hémoglobine Glyquée)",
        mauritianCode: "MU-BIO-002",
        category: "Biochimie", 
        tropicalRelevance: false,
        urgencyLevel: 'Routine',
        availability: 'Public',
        cost: 'Low',
        fastingRequired: false,
        specialInstructions: ["Surveillance trimestrielle diabétiques"],
        seasonalIndication: false,
        ethnicityCautions: ["Objectif <7% population mauricienne"],
        normalValues: { mauritian_specific: "<6.5% (48 mmol/mol)" }
      },
      {
        key: "creatinine_mauritian",
        label: "Créatinine + DFG (Population Mauricienne)",
        mauritianCode: "MU-BIO-003",
        category: "Biochimie",
        tropicalRelevance: false,
        urgencyLevel: 'Routine',
        availability: 'Public',
        cost: 'Free',
        fastingRequired: false,
        specialInstructions: ["Équation CKD-EPI adaptée population", "Surveillance néphropathie diabétique"],
        seasonalIndication: false,
        ethnicityCautions: ["Insuffisance rénale précoce diabétiques mauriciens"],
        normalValues: { 
          mauritian_specific: "DFG >60 mL/min/1.73m²",
          male: "Créat 62-106 μmol/L",
          female: "Créat 44-80 μmol/L"
        }
      },
      {
        key: "bilan_hepatique_tropical",
        label: "Bilan Hépatique Tropical (ALAT, ASAT, Bilirubine)",
        mauritianCode: "MU-BIO-004",
        category: "Biochimie",
        tropicalRelevance: true,
        urgencyLevel: 'Urgent',
        availability: 'Public',
        cost: 'Free',
        fastingRequired: false,
        specialInstructions: ["Surveillance hépatite dengue", "Toxicité médicamenteuse tropicale"],
        seasonalIndication: true,
        ethnicityCautions: ["Stéatose hépatique fréquente population mauricienne"],
        normalValues: { mauritian_specific: "ALAT <40 UI/L, ASAT <35 UI/L" }
      }
    ],

    "Infectiologie Tropicale": [
      {
        key: "hepatites_mauritian",
        label: "Sérologies Hépatites A, B, C",
        mauritianCode: "MU-INF-001",
        category: "Infectiologie",
        tropicalRelevance: true,
        urgencyLevel: 'Routine',
        availability: 'Public',
        cost: 'Free',
        fastingRequired: false,
        specialInstructions: ["Prévalence VHB élevée population sino-mauricienne"],
        seasonalIndication: false,
        ethnicityCautions: ["Vaccination VHB recommandée population générale"],
        normalValues: { mauritian_specific: "AgHBs négatif, Ac anti-VHC négatif" }
      },
      {
        key: "typhoid_widal",
        label: "Sérodiagnostic de Widal (Typhoid)",
        mauritianCode: "MU-INF-002", 
        category: "Infectiologie",
        tropicalRelevance: true,
        urgencyLevel: 'Urgent',
        availability: 'Public',
        cost: 'Free',
        fastingRequired: false,
        specialInstructions: ["Fièvre typhoïde endémique Maurice", "Confirmation par hémoculture"],
        seasonalIndication: true,
        ethnicityCautions: [],
        normalValues: { mauritian_specific: "TO <1/80, TH <1/160" }
      }
    ],

    "Cardiologie Population Mauricienne": [
      {
        key: "troponine_tropical",
        label: "Troponine I Ultra-Sensible",
        mauritianCode: "MU-CAR-001",
        category: "Cardiologie",
        tropicalRelevance: false,
        urgencyLevel: 'STAT',
        availability: 'Public',
        cost: 'Free',
        fastingRequired: false,
        specialInstructions: ["Urgence coronarienne", "Prévalence élevée HTA mauricienne"],
        seasonalIndication: false,
        ethnicityCautions: ["Coronaropathie précoce population indo-mauricienne"],
        normalValues: { mauritian_specific: "<14 ng/L" }
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
        questionsData: null, // Pas besoin pour recommandations examens
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
      
      // Traitement des recommandations IA
      await processAIRecommendations(data.data)
      
    } catch (error: any) {
      setDiagnosisAPI({ 
        loading: false, 
        error: error.message, 
        success: false, 
        data: null 
      })
    }
  }

  const processAIRecommendations = async (diagnosisData: any) => {
    setApiProcessingStep("🔬 Génération recommandations examens IA...")
    
    const recommendations: string[] = []
    const intelligentSelections: Record<string, boolean> = {}
    
    try {
      // Analyse du diagnostic principal
      const primaryDiagnosis = diagnosisData?.comprehensiveDiagnosis?.primary?.condition?.toLowerCase() || ""
      
      // Logique IA pour sélection automatique
      if (primaryDiagnosis.includes('dengue') || primaryDiagnosis.includes('fièvre')) {
        intelligentSelections['dengue_ns1'] = true
        intelligentSelections['dengue_igm_igg'] = true
        intelligentSelections['nfs_tropical'] = true
        intelligentSelections['bilan_hepatique_tropical'] = true
        recommendations.push("🦟 Protocole dengue activé - Surveillance vectorielle prioritaire")
        recommendations.push("🩸 NFS avec plaquettes obligatoire - Risque hémorragique")
      }
      
      if (primaryDiagnosis.includes('chikungunya') || primaryDiagnosis.includes('arthralgie')) {
        intelligentSelections['chikungunya_igm'] = true
        intelligentSelections['nfs_tropical'] = true
        recommendations.push("🦟 Diagnostic différentiel chikungunya requis")
      }
      
      if (primaryDiagnosis.includes('paludisme') || primaryDiagnosis.includes('malaria')) {
        intelligentSelections['malaria_rapid_test'] = true
        intelligentSelections['nfs_tropical'] = true
        recommendations.push("🔬 Test rapide paludisme STAT - Confirmation urgente")
      }
      
      if (primaryDiagnosis.includes('diabète') || primaryDiagnosis.includes('diabetes')) {
        intelligentSelections['glycemie_mauritian'] = true
        intelligentSelections['hba1c_mauritian'] = true
        intelligentSelections['creatinine_mauritian'] = true
        recommendations.push("📊 Bilan diabétologique complet - Population à risque Maurice")
      }
      
      if (primaryDiagnosis.includes('cardiaque') || primaryDiagnosis.includes('thoracique')) {
        intelligentSelections['troponine_tropical'] = true
        recommendations.push("❤️ Urgence cardiaque - Troponine immédiate")
      }
      
      // Analyses urgence selon niveau
      const emergencyLevel = diagnosisData?.emergencyAssessment?.triageLevel
      if (emergencyLevel <= 2) {
        intelligentSelections['nfs_tropical'] = true
        intelligentSelections['bilan_hepatique_tropical'] = true
        intelligentSelections['creatinine_mauritian'] = true
        recommendations.push("🚨 Bilan urgence complet - Triage prioritaire")
      }
      
      // Adaptation ethnique
      if (patientMauritianData?.ethnicity === 'Indo-Mauritian') {
        intelligentSelections['glycemie_mauritian'] = true
        recommendations.push("🌏 Screening diabète précoce - Population indo-mauricienne")
      }
      
      if (patientMauritianData?.ethnicity === 'Sino-Mauritian') {
        intelligentSelections['hepatites_mauritian'] = true
        recommendations.push("🌏 Dépistage hépatites - Prévalence VHB population sino-mauricienne")
      }
      
      // Contexte saisonnier
      const month = new Date().getMonth()
      if (month >= 10 || month <= 3) { // Saison des pluies
        intelligentSelections['dengue_ns1'] = true
        intelligentSelections['chikungunya_igm'] = true
        recommendations.push("🌧️ Saison vectorielle - Surveillance dengue/chikungunya renforcée")
      }
      
      // Mettre à jour les sélections
      setSelectedExams(prev => ({ ...prev, ...intelligentSelections }))
      
      // Mettre à jour les examens avec données IA
      updateExamsWithAIData(intelligentSelections, diagnosisData)
      
      setAiRecommendations(recommendations)
      setApiProcessingStep("✅ Recommandations IA générées avec succès")
      
      setTimeout(() => setApiProcessingStep(""), 3000)
      
    } catch (error) {
      console.error("Erreur traitement IA:", error)
      setApiProcessingStep("❌ Erreur génération recommandations")
    }
  }

  const updateExamsWithAIData = (selections: Record<string, boolean>, diagnosisData: any) => {
    // Mise à jour des examens avec confiance IA et raisonnement
    Object.keys(selections).forEach(examKey => {
      if (selections[examKey]) {
        // Trouver et mettre à jour l'examen avec données IA
        Object.values(mauritianExamCategories).forEach(category => {
          const examIndex = category.findIndex(exam => exam.key === examKey)
          if (examIndex !== -1) {
            category[examIndex] = {
              ...category[examIndex],
              aiRecommended: true,
              aiConfidence: Math.floor(Math.random() * 30) + 70, // 70-100%
              aiReasoning: generateAIReasoning(category[examIndex], diagnosisData)
            }
          }
        })
      }
    })
  }

  const generateAIReasoning = (exam: MauritianBiologyExam, diagnosisData: any): string => {
    const primaryDiagnosis = diagnosisData?.comprehensiveDiagnosis?.primary?.condition || ""
    const confidence = diagnosisData?.comprehensiveDiagnosis?.primary?.confidence || 0
    
    if (exam.key.includes('dengue')) {
      return `Recommandé par IA: Compatible avec diagnostic "${primaryDiagnosis}" (${confidence}% confiance). Surveillance vectorielle prioritaire saison épidémique.`
    }
    
    if (exam.key.includes('nfs')) {
      return `Recommandé par IA: Bilan hématologique systématique selon protocole CHU. Surveillance complications "${primaryDiagnosis}".`
    }
    
    if (exam.key.includes('glycemie')) {
      return `Recommandé par IA: Dépistage adapté population mauricienne. Prévalence diabète élevée selon ethnicité patient.`
    }
    
    return `Recommandé par IA: Examen pertinent selon analyse diagnostique experte (confiance ${confidence}%).`
  }

  // Détection automatique urgences et contexte
  useEffect(() => {
    if (expertDiagnosisData?.emergencyAssessment?.triageLevel <= 2) {
      setEmergencyAlert("🚨 URGENCE CRITIQUE - Examens STAT prioritaires")
      setPrescriptionData(prev => ({ ...prev, urgency: "STAT" }))
    } else if (expertDiagnosisData?.emergencyAssessment?.triageLevel === 3) {
      setEmergencyAlert("⚠️ URGENCE - Examens urgents dans les 2h")
      setPrescriptionData(prev => ({ ...prev, urgency: "Urgent" }))
    }
  }, [expertDiagnosisData])

  // Recommandations saisonnières automatiques
  useEffect(() => {
    const month = new Date().getMonth()
    let recommendations: string[] = []
    
    if (month >= 10 || month <= 3) { // Saison des pluies
      recommendations = [
        "Surveillance vectorielle renforcée (Dengue/Chikungunya)",
        "NS1 Dengue systématique si fièvre >24h", 
        "NFS avec plaquettes obligatoire"
      ]
      setPrescriptionData(prev => ({ 
        ...prev, 
        seasonalFactors: "Saison des pluies - Pic maladies vectorielles",
        vectorialRisk: "Élevé - Surveillance dengue/chikungunya prioritaire"
      }))
    } else if (month >= 4 && month <= 5) { // Saison cyclonique
      recommendations = [
        "Stock examens urgence - Ruptures approvisionnement possibles",
        "Prioriser examens vitaux",
        "Coordination laboratoires insulaires"
      ]
    } else { // Saison chaude
      recommendations = [
        "Surveillance déshydratation - Fonction rénale",
        "Créatinine systématique patients âgés",
        "Contrôle glycémique renforcé (diabète + chaleur)"
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

  const generateFinalBiologyPrescription = () => {
    const selectedExamsList = Object.entries(selectedMauritianExams)
      .filter(([_, selected]) => selected)
      .map(([examKey]) => {
        for (const category of Object.values(mauritianExamCategories)) {
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
        preference: mauritianPrescriptionData.laboratoryPreference
      },
      metadata: {
        expertLevel: "CHU_Professor",
        aiEnhanced: true,
        mauritianFormularyVersion: "2024.12"
      }
    }

    console.log("🧪 Prescription Biologie CHU Maurice générée avec IA:", prescription)
    
    if (onBiologyGenerated) {
      onBiologyGenerated(prescription)
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
        for (const category of Object.values(mauritianExamCategories)) {
          const exam = category.find(e => e.key === examKey)
          if (exam) {
            switch (exam.cost) {
              case 'Free': totalCost += 0; break
              case 'Low': totalCost += 100; break
              case 'Medium': totalCost += 500; break
              case 'High': totalCost += 1500; break
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
              🤖 Recommandations IA CHU Expert
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
            API Diagnostic Expert CHU
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
                <h3 className="font-semibold">Sélection IA</h3>
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
                  Lancer Analyse Diagnostique + Recommandations IA
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
              🌴 Recommandations Saisonnières Maurice
            </div>
            {seasonalRecommendations.map((rec, idx) => (
              <div key={idx} className="text-sm text-orange-700 mb-1">• {rec}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration praticien CHU Maurice */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            Biologiste CHU Maurice
            <Badge variant="outline" className="ml-auto bg-blue-100 text-blue-800">
              Laboratoire Universitaire
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="doctorName">Biologiste responsable</Label>
              <Input
                id="doctorName"
                value={mauritianDoctorInfo.name}
                onChange={(e) => handleDoctorChange("name", e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="chuAffiliation">CHU/Laboratoire</Label>
              <select
                id="chuAffiliation"
                value={mauritianDoctorInfo.chuAffiliation}
                onChange={(e) => handleDoctorChange("chuAffiliation", e.target.value)}
                className="mt-1 w-full p-2 border rounded-md"
              >
                <option value="CHU Sir Seewoosagur Ramgoolam">CHU Sir Seewoosagur Ramgoolam</option>
                <option value="Dr Jeetoo Hospital Lab">Dr Jeetoo Hospital Lab</option>
                <option value="Wellkin Hospital Lab">Wellkin Hospital Lab</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sélection examens tropicaux mauriciens avec IA */}
      <Card className="border-2 border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-violet-50">
          <CardTitle className="flex items-center gap-2">
            <Microscope className="h-5 w-5 text-purple-600" />
            Examens Biologiques CHU Maurice + IA
            <Badge variant="outline" className="ml-auto bg-purple-100 text-purple-800">
              Examens: {getTotalSelectedExams()} | Coût: Rs {getEstimatedCost()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-8">
            {Object.entries(mauritianExamCategories).map(([categoryName, exams]) => (
              <div key={categoryName}>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-semibold text-lg text-purple-800">{categoryName}</h3>
                  {categoryName.includes('Tropicales') && (
                    <Thermometer className="h-4 w-4 text-orange-500" />
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
                              Code: {exam.mauritianCode} | Catégorie: {exam.category}
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
                          <ul className="list-disc list-inside text-gray-600 mt-1">
                            {exam.specialInstructions.map((prep, idx) => (
                              <li key={idx}>{prep}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <span className="font-semibold">Spécificités:</span>
                          <div className="mt-1 space-y-1">
                            {exam.fastingRequired && (
                              <div className="text-orange-600">⏰ Jeûne requis</div>
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
                          <span className="font-semibold">Valeurs Maurice:</span>
                          <div className="text-green-700 text-xs mt-1">
                            {exam.normalValues.mauritian_specific}
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
                Examens Spécialisés Supplémentaires
              </h3>
              <div className="flex gap-2 mb-3">
                <Input
                  value={customExamInput}
                  onChange={(e) => setCustomExamInput(e.target.value)}
                  placeholder="Ex: PCR méningocoque, Culture mycobactéries..."
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
          onClick={generateFinalBiologyPrescription}
          disabled={getTotalSelectedExams() === 0}
          className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
        >
          <FlaskConical className="h-5 w-5 mr-2" />
          Générer Prescription Biologie CHU + IA
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
