"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { 
  User, 
  Stethoscope, 
  Brain, 
  Pill, 
  GraduationCap,
  Globe,
  Thermometer,
  Wifi,
  MapPin,
  Award,
  BookOpen,
  Shield,
  Heart,
  Download,
  Printer,
  AlertTriangle,
  Calendar,
  Clock,
  Database,
  Microscope,
  Camera,
  Loader2,
  CheckCircle,
  XCircle,
  Zap,
  TrendingUp,
  RefreshCw,
  Lightbulb,
  Target,
  FileText
} from "lucide-react"
import { useTibokDoctorData } from "@/hooks/use-tibok-doctor-data"

interface CHUMauritiusConsultationReportProps {
  patientMauritianData: any
  tropicalClinicalData: any
  expertDiagnosisData?: any
  drugVerificationData: any
  rxnormData: any
  pubmedData: any
  telemedicineData: any
  biologyData?: any
  imagingData?: any
}

interface APICallState {
  loading: boolean
  error: string | null
  success: boolean
  data: any
}

export default function CHUMauritiusConsultationReport({
  patientMauritianData,
  tropicalClinicalData,
  expertDiagnosisData: initialExpertData,
  drugVerificationData,
  rxnormData,
  pubmedData,
  telemedicineData,
  biologyData,
  imagingData,
}: CHUMauritiusConsultationReportProps) {

  // Get doctor data from TIBOK
  const { doctorData: tibokDoctorData, isFromTibok } = useTibokDoctorData()
  const { toast } = useToast()

  // Initialize doctor info with TIBOK data if available, otherwise use defaults
  const [mauritianDoctorInfo, setMauritianDoctorInfo] = useState(() => {
    if (tibokDoctorData) {
      console.log('Using TIBOK doctor data:', tibokDoctorData)
      return {
        name: tibokDoctorData.fullName || "Dr. TIBOK IA DOCTOR",
        title: tibokDoctorData.experience ? "Dr" : "Dr",
        specialty: tibokDoctorData.specialty || "Médecine Générale",
        chuAffiliation: "CHU Sir Seewoosagur Ramgoolam",
        mauritianMedicalCouncil: tibokDoctorData.medicalCouncilNumber || "MMC-2024-AUTO",
        department: `Service de ${tibokDoctorData.specialty || "Médecine Générale"}`,
        address: "Pamplemousses, Maurice",
        phone: tibokDoctorData.phone || "+230 XXX-XXXX",
        email: tibokDoctorData.email || "doctor@chu.maurice.mu",
        academicTitle: "Praticien Hospitalier",
        expertise: ["Télémédecine", tibokDoctorData.specialty || "Médecine Générale", "Evidence-Based Medicine"],
        universityAffiliation: "University of Mauritius Medical School"
      }
    }
    
    // Default values if no TIBOK data
    return {
      name: "Dr. TIBOK IA DOCTOR",
      title: "Dr",
      specialty: "Médecine Générale",
      chuAffiliation: "CHU Sir Seewoosagur Ramgoolam",
      mauritianMedicalCouncil: "MMC-2024-AUTO",
      department: "Service de Médecine Générale",
      address: "Pamplemousses, Maurice",
      phone: "+230 XXX-XXXX",
      email: "doctor@chu.maurice.mu",
      academicTitle: "Praticien Hospitalier",
      expertise: ["Télémédecine", "Médecine Générale", "Evidence-Based Medicine"],
      universityAffiliation: "University of Mauritius Medical School"
    }
  })

  const [mauritianReportData, setReportData] = useState({
    consultationDate: new Date().toLocaleDateString("fr-FR"),
    mauritianDate: new Date().toLocaleDateString("en-GB"),
    consultationTime: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    consultationType: telemedicineData ? "Télémédecine CHU" : "Consultation Présentielle",
    seasonalContext: "",
    tropicalAlert: "",
    cycloneStatus: "",
    urgencyLevel: "Standard",
    evidenceLevel: "A",
    chuProtocol: "",
    teachingNotes: "",
    researchNotes: "",
    followUpPlan: "",
    mauritianSpecifics: "",
    culturalConsiderations: "",
    additionalNotes: "",
    emergencyContacts: "SAMU 114 | Police 999"
  })

  const [reportSections, setReportSections] = useState({
    showDiagnosticReasoning: true,
    showEvidenceBased: true,
    showTropicalContext: true,
    showTeachingPoints: true,
    showTeleMedNotes: !!telemedicineData,
    showResearchAspects: true,
    showMauritianSpecifics: true
  })

  const [emergencyAlert, setEmergencyAlert] = useState<string | null>(null)
  const [tropicalWarnings, setTropicalWarnings] = useState<string[]>([])
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
  const [aiGeneratedContent, setAiGeneratedContent] = useState({
    teachingPoints: "",
    mauritianSpecifics: "",
    culturalConsiderations: "",
    researchNotes: "",
    followUpPlan: "",
    evidenceSummary: ""
  })

  // Add a useEffect to show when doctor data is loaded
  useEffect(() => {
    if (isFromTibok && tibokDoctorData) {
      console.log('TIBOK doctor data loaded successfully:', tibokDoctorData)
      
      // Update doctor info with TIBOK data
      setMauritianDoctorInfo({
        name: tibokDoctorData.fullName || "Dr. TIBOK IA DOCTOR",
        title: tibokDoctorData.experience ? "Dr" : "Dr",
        specialty: tibokDoctorData.specialty || "Médecine Générale",
        chuAffiliation: "CHU Sir Seewoosagur Ramgoolam",
        mauritianMedicalCouncil: tibokDoctorData.medicalCouncilNumber || "MMC-2024-AUTO",
        department: `Service de ${tibokDoctorData.specialty || "Médecine Générale"}`,
        address: "Pamplemousses, Maurice",
        phone: tibokDoctorData.phone || "+230 XXX-XXXX",
        email: tibokDoctorData.email || "doctor@chu.maurice.mu",
        academicTitle: "Praticien Hospitalier",
        expertise: ["Télémédecine", tibokDoctorData.specialty || "Médecine Générale", "Evidence-Based Medicine"],
        universityAffiliation: "University of Mauritius Medical School"
      })
    }
  }, [isFromTibok, tibokDoctorData])

  // Appel API diagnostic expert pour recommandations intelligentes de rapport
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
      
      // Traitement des recommandations IA pour le rapport
      await processAIReportRecommendations(data.data)
      
    } catch (error: any) {
      setDiagnosisAPI({ 
        loading: false, 
        error: error.message, 
        success: false, 
        data: null 
      })
    }
  }

  const processAIReportRecommendations = async (diagnosisData: any) => {
    setApiProcessingStep("📋 Génération contenu rapport IA...")
    
    const recommendations: string[] = []
    
    try {
      // Analyse du diagnostic principal
      const primaryDiagnosis = diagnosisData?.comprehensiveDiagnosis?.primary?.condition?.toLowerCase() || ""
      const confidence = diagnosisData?.comprehensiveDiagnosis?.primary?.confidence || 0
      const severity = diagnosisData?.comprehensiveDiagnosis?.primary?.severity || ""
      
      // Génération contenu IA pour le rapport
      const generatedContent = generateAIReportContent(diagnosisData, primaryDiagnosis, confidence, severity)
      setAiGeneratedContent(generatedContent)
      
      // Recommandations IA pour le rapport
      if (confidence >= 85) {
        recommendations.push("📊 Diagnostic haute confiance - Rapport détaillé avec recommandations fermes")
      } else if (confidence >= 70) {
        recommendations.push("📊 Diagnostic probable - Rapport avec surveillance renforcée")
      } else {
        recommendations.push("📊 Diagnostic incertain - Rapport avec diagnostic différentiel élargi")
      }
      
      if (primaryDiagnosis.includes('dengue') || primaryDiagnosis.includes('chikungunya')) {
        recommendations.push("🦟 Maladie vectorielle - Rapport avec contexte épidémiologique")
        recommendations.push("📚 Valeur pédagogique élevée - Points d'enseignement tropicaux")
      }
      
      if (severity === 'severe' || severity === 'critical') {
        recommendations.push("🚨 Cas complexe - Rapport avec analyse approfondie")
        recommendations.push("🎓 Intérêt académique CHU - Documentation pour enseignement")
      }
      
      // Adaptation ethnique automatique
      if (patientMauritianData?.ethnicity === 'Indo-Mauritian') {
        recommendations.push("🌏 Adaptation population indo-mauricienne - Spécificités génétiques")
      }
      
      if (patientMauritianData?.ethnicity === 'Creole') {
        recommendations.push("🌏 Adaptation population créole - Facteurs de risque cardiovasculaires")
      }
      
      // Contexte télémédecine
      if (telemedicineData) {
        recommendations.push("💻 Télémédecine - Documentation contraintes et adaptations")
      }
      
      // Evidence-based selon données PubMed
      if (pubmedData?.studies?.length > 0) {
        const levelAStudies = pubmedData.studies.filter((s: any) => s.evidenceLevel === 'A').length
        if (levelAStudies >= 2) {
          recommendations.push("📖 Evidence forte - Rapport avec références niveau A")
        }
      }
      
      // Mise à jour automatique des champs
      updateReportFieldsFromAI(generatedContent, diagnosisData)
      
      setAiRecommendations(recommendations)
      setApiProcessingStep("✅ Contenu rapport IA généré avec succès")
      
      setTimeout(() => setApiProcessingStep(""), 3000)
      
    } catch (error) {
      console.error("Erreur traitement IA rapport:", error)
      setApiProcessingStep("❌ Erreur génération contenu rapport")
    }
  }

  const generateAIReportContent = (diagnosisData: any, primaryDiagnosis: string, confidence: number, severity: string) => {
    const content = {
      teachingPoints: "",
      mauritianSpecifics: "",
      culturalConsiderations: "",
      researchNotes: "",
      followUpPlan: "",
      evidenceSummary: ""
    }

    // Points d'enseignement IA
    if (primaryDiagnosis.includes('dengue')) {
      content.teachingPoints = `Points d'enseignement CHU:
• Diagnostic différentiel des fièvres tropicales en contexte mauricien
• Évolution naturelle dengue: phases fébrile, critique, récupération
• Surveillance complications: syndrome de fuite capillaire, hémorragies
• Critères hospitalisation selon recommandations OMS adaptées Maurice
• Épidémiologie vectorielle Aedes aegypti - lutte antivectorielle
• Particularités population mauricienne: facteurs génétiques, co-infections
      
Références pédagogiques:
- OMS Dengue Guidelines 2023
- Tropical Medicine International - épidémiologie océan Indien
- Étude CHU Réunion - cas similaires population insulaire`
    } else if (primaryDiagnosis.includes('cardiaque')) {
      content.teachingPoints = `Points d'enseignement CHU:
• Facteurs de risque cardiovasculaire population mauricienne
• Prédisposition génétique population indo-mauricienne
• Interaction diabète-HTA en contexte tropical
• Diagnostic différentiel douleur thoracique pays tropical
• Adaptation thérapeutique selon ethnicité et climat
• Prévention primaire/secondaire adaptée Maurice
      
Cas d'école pour:
- Internes: diagnostic différentiel systématique
- Résidents: prise en charge multidisciplinaire
- Formation continue: médecine personnalisée`
    }

    // Spécificités mauriciennes IA
    content.mauritianSpecifics = `Adaptations contexte mauricien:
• Prévalence pathologie selon ethnicité patient (${patientMauritianData?.ethnicity})
• Facteurs environnementaux tropicaux influençant évolution
• Disponibilité thérapeutique selon formulaire national Maurice
• Accessibilité géographique soins selon région (${patientMauritianData?.region})
• Saisonnalité pathologie (saison ${getCurrentSeason()})
• Coordination CHU - hôpitaux régionaux
• Coût-efficacité traitement selon système de santé mauricien

Pharmacogénétique population:
- Métabolisme médicaments variable selon origine ethnique
- Adaptation posologique recommandée
- Surveillance effets indésirables spécifiques`

    // Considérations culturelles IA
    content.culturalConsiderations = `Aspects culturels mauriciens:
• Communication multilingue: ${patientMauritianData?.languages?.join(', ') || 'français/créole/anglais'}
• Implication famille selon traditions culturelles
• Médecines traditionnelles potentielles: ayurveda, médecine chinoise
• Observance thérapeutique - facteurs socio-culturels
• Habitudes alimentaires influençant traitement
• Période ramadan/festivals religieux - adaptation thérapeutique
• Accessibilité femmes selon contexte culturel
• Éducation santé adaptée niveau socio-économique`

    // Notes recherche IA
    if (confidence < 80 || severity === 'severe') {
      content.researchNotes = `Opportunités recherche:
• Cas intéressant pour base données CHU Maurice
• Étude épidémiologique population mauricienne
• Comparaison évolution selon ethnicité
• Validation biomarqueurs en contexte tropical
• Recherche collaborative océan Indien (Réunion, Seychelles)
• Publication potentielle: "${primaryDiagnosis} population mauricienne"
• Thèse médecine: facteurs pronostiques spécifiques

Financement recherche:
- Commission océan Indien
- Université Maurice - projets tropical medicine
- Coopération française - CHU Réunion`
    }

    // Plan de suivi IA
    content.followUpPlan = generateAIFollowUpPlan(diagnosisData, severity)

    return content
  }

  const generateAIFollowUpPlan = (diagnosisData: any, severity: string) => {
    const urgency = severity === 'critical' ? 'immédiate' : severity === 'severe' ? '24-48h' : '1-2 semaines'
    
    return `Plan suivi CHU adapté:

SURVEILLANCE IMMÉDIATE:
• Signes d'alarme à surveiller: ${getAlarmSigns(diagnosisData)}
• Reconsultation si aggravation: ${urgency}
• Paramètres vitaux à domicile si télémédecine
• Contact famille/aidant pour surveillance

SUIVI PROGRAMMÉ:
• Consultation contrôle: J7-J10 sauf aggravation
• Examens biologiques contrôle selon évolution
• Adaptation thérapeutique selon réponse
• Coordination médecin traitant Maurice

ÉDUCATION PATIENT/FAMILLE:
• Explication maladie en langue appropriée
• Signes nécessitant consultation urgente
• Observance thérapeutique - importance compliance
• Mesures préventives spécifiques Maurice

CONTACTS URGENCE MAURICE:
• SAMU: 114 (urgences vitales)
• Police: 999 (transport urgence)
• CHU garde: +230 266-xxxx
• Médecin traitant: coordonnées personnelles`
  }

  const updateReportFieldsFromAI = (content: any, diagnosisData: any) => {
    // Mise à jour automatique des champs avec contenu IA
    setReportData(prev => ({
      ...prev,
      teachingNotes: content.teachingPoints,
      mauritianSpecifics: content.mauritianSpecifics,
      culturalConsiderations: content.culturalConsiderations,
      researchNotes: content.researchNotes,
      followUpPlan: content.followUpPlan,
      urgencyLevel: diagnosisData?.emergencyAssessment?.triageLevel <= 2 ? "Critical" : 
                   diagnosisData?.emergencyAssessment?.triageLevel === 3 ? "High" : "Standard"
    }))
  }

  // Détection automatique urgences et contexte
  useEffect(() => {
    // Détection urgences
    if (expertDiagnosisData?.emergencyAssessment?.triageLevel <= 2) {
      setEmergencyAlert("🚨 URGENCE CRITIQUE - Hospitalisation immédiate")
      setReportData(prev => ({ ...prev, urgencyLevel: "Critical" }))
    } else if (expertDiagnosisData?.emergencyAssessment?.triageLevel === 3) {
      setEmergencyAlert("⚠️ URGENCE - Surveillance rapprochée requise")
      setReportData(prev => ({ ...prev, urgencyLevel: "High" }))
    }

    // Contexte saisonnier
    const month = new Date().getMonth()
    let seasonal = ""
    let warnings: string[] = []
    
    if (month >= 10 || month <= 3) {
      seasonal = "Saison des pluies/cyclonique - Surveillance vectorielle renforcée"
      warnings = ["Dengue/Chikungunya épidémique", "Préparation cyclones", "Ruptures de soins possibles"]
    } else {
      seasonal = "Saison sèche - Surveillance déshydratation et maladies chroniques"
      warnings = ["Adaptation thérapeutique climat", "Surveillance cardiovasculaire"]
    }
    
    setReportData(prev => ({ 
      ...prev, 
      seasonalContext: seasonal,
      tropicalAlert: warnings.join('; ')
    }))
    setTropicalWarnings(warnings)

    // Niveau de preuve
    if (pubmedData?.studies?.length > 0) {
      const levelAStudies = pubmedData.studies.filter((s: any) => s.evidenceLevel === 'A').length
      setReportData(prev => ({ 
        ...prev, 
        evidenceLevel: levelAStudies >= 2 ? 'A' : levelAStudies >= 1 ? 'B' : 'C'
      }))
    }
  }, [expertDiagnosisData, pubmedData])

  const handleDoctorChange = useCallback((field: string, value: string) => {
    setMauritianDoctorInfo((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleReportChange = useCallback((field: string, value: string) => {
    setReportData((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleSectionToggle = useCallback((section: string, checked: boolean) => {
    setReportSections((prev) => ({ ...prev, [section]: checked }))
  }, [])

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'bg-green-100 text-green-800'
    if (confidence >= 70) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const getEvidenceLevelColor = (level: string) => {
    switch (level) {
      case 'A': return 'bg-green-100 text-green-800'
      case 'B': return 'bg-yellow-100 text-yellow-800'
      case 'C': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const generateCHUReport = () => {
    const report = {
      header: {
        ...mauritianDoctorInfo,
        isFromTibok: isFromTibok,
        generatedAt: new Date().toISOString(),
        reportType: 'CHU Consultation Report'
      },
      patient: patientMauritianData,
      consultation: {
        ...mauritianReportData,
        doctorId: tibokDoctorData?.id || null,
        doctorName: mauritianDoctorInfo.name,
        doctorSpecialty: mauritianDoctorInfo.specialty,
        doctorCouncilNumber: mauritianDoctorInfo.mauritianMedicalCouncil
      },
      medical: {
        clinical: tropicalClinicalData,
        diagnosis: expertDiagnosisData,
        prescriptions: drugVerificationData,
        examinations: { biology: biologyData, imaging: imagingData }
      },
      academic: {
        evidence: pubmedData,
        teaching: mauritianReportData.teachingNotes,
        research: mauritianReportData.researchNotes
      },
      tropical: {
        seasonal: mauritianReportData.seasonalContext,
        warnings: tropicalWarnings,
        adaptations: mauritianReportData.mauritianSpecifics
      },
      telemedicine: telemedicineData,
      aiEnhanced: {
        generated: aiGeneratedContent,
        recommendations: aiRecommendations,
        processed: diagnosisAPI.success,
        timestamp: new Date().toISOString()
      },
      tibokIntegration: {
        isFromTibok: isFromTibok,
        doctorData: tibokDoctorData,
        timestamp: new Date().toISOString()
      },
      doctorSignature: {
        name: mauritianDoctorInfo.name,
        title: mauritianDoctorInfo.title,
        specialty: mauritianDoctorInfo.specialty,
        councilNumber: mauritianDoctorInfo.mauritianMedicalCouncil,
        institution: mauritianDoctorInfo.chuAffiliation,
        signedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    }
    
    console.log("Rapport CHU Maurice généré avec données médecin TIBOK:", report)
    
    // If you need to save this to a database or API, you can do it here
    // Example:
    // saveReportToSupabase(report)
    
    return report
  }

  // Function to save report to TIBOK
  const saveReportToTibok = async () => {
    try {
      // Get the report data
      const report = generateCHUReport()
      
      // Get consultation ID from URL or sessionStorage
      const params = new URLSearchParams(window.location.search)
      const consultationId = params.get('consultationId') || sessionStorage.getItem('consultationId')
      const patientId = params.get('patientId') || sessionStorage.getItem('patientId')
      const doctorId = tibokDoctorData?.id || sessionStorage.getItem('doctorId')
      
      if (!consultationId || !patientId || !doctorId) {
        toast({
          title: "Erreur",
          description: "Informations de consultation manquantes",
          variant: "destructive"
        })
        return
      }

      // Add consultation and patient IDs to report
      const fullReport = {
        ...report,
        consultationId,
        patientId,
        doctorId
      }

      // Determine TIBOK URL (use environment variable or default)
      const tibokUrl = process.env.NEXT_PUBLIC_TIBOK_URL || 'https://tibok.vercel.app'
      
      // Save to TIBOK
      const response = await fetch(`${tibokUrl}/api/consultations/save-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullReport)
      })

      if (!response.ok) {
        throw new Error('Failed to save report to TIBOK')
      }

      const result = await response.json()
      
      toast({
        title: "Succès",
        description: "Rapport sauvegardé avec succès dans TIBOK",
      })

      // Store report ID for future reference
      if (result.reportId) {
        sessionStorage.setItem('reportId', result.reportId)
      }

      return result
      
    } catch (error) {
      console.error('Error saving report to TIBOK:', error)
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder le rapport dans TIBOK",
        variant: "destructive"
      })
    }
  }

  // Fonctions utilitaires
  const getCurrentSeason = () => {
    const month = new Date().getMonth()
    if (month >= 10 || month <= 3) return "pluies/cyclonique"
    return "sèche"
  }

  const getAlarmSigns = (diagnosisData: any) => {
    const primary = diagnosisData?.comprehensiveDiagnosis?.primary?.condition?.toLowerCase() || ""
    if (primary.includes('dengue')) return "fièvre persistante, vomissements, douleurs abdominales, saignements"
    if (primary.includes('cardiaque')) return "douleur thoracique, dyspnée, malaises"
    return "aggravation symptômes, fièvre élevée, altération état général"
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

      {/* TIBOK Integration Alert */}
      {isFromTibok && (
        <Alert className="border-blue-500 bg-blue-50">
          <CheckCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="font-semibold">Consultation TIBOK intégrée</div>
            <div className="text-sm">Médecin: {mauritianDoctorInfo.name} • {mauritianDoctorInfo.specialty}</div>
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
              🤖 Recommandations Rapport IA CHU Expert
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
            API Diagnostic Expert CHU - Rapport IA
            <Badge variant="outline" className="ml-auto bg-purple-100 text-purple-800">
              IA Génération Contenu
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

            {/* Génération IA */}
            <div className="border rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-orange-600" />
                <h3 className="font-semibold">Génération IA Rapport</h3>
                <Badge variant="outline" className="text-xs">
                  Contenu Auto
                </Badge>
              </div>
              <div className="text-sm">
                <div>Auto-génération: {diagnosisAPI.success ? 'Activée ✅' : 'En attente'}</div>
                <div>Enseignement: {aiGeneratedContent.teachingPoints ? 'Généré ✅' : 'En attente'}</div>
                <div>Spécificités: {aiGeneratedContent.mauritianSpecifics ? 'Générées ✅' : 'En attente'}</div>
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
                  Génération IA en cours...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Lancer Analyse + Génération Contenu Rapport IA
                </>
              )}
            </Button>
          </div>

          {/* Aperçu contenu généré */}
          {diagnosisAPI.success && aiGeneratedContent.teachingPoints && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-green-600" />
                <span className="font-semibold text-green-800">Contenu IA Généré</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                <div>📚 Points enseignement: {aiGeneratedContent.teachingPoints.length > 100 ? 'Généré' : 'En attente'}</div>
                <div>🌏 Spécificités Maurice: {aiGeneratedContent.mauritianSpecifics.length > 100 ? 'Généré' : 'En attente'}</div>
                <div>🎭 Aspects culturels: {aiGeneratedContent.culturalConsiderations.length > 100 ? 'Généré' : 'En attente'}</div>
                <div>🔬 Notes recherche: {aiGeneratedContent.researchNotes.length > 100 ? 'Généré' : 'En attente'}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alertes tropicales */}
      {tropicalWarnings.length > 0 && (
        <Alert className="border-orange-500 bg-orange-50">
          <Thermometer className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <div className="text-orange-800 font-semibold mb-2">
              🌴 Contexte Tropical Maurice - Alertes Saisonnières
            </div>
            {tropicalWarnings.map((warning, idx) => (
              <div key={idx} className="text-sm text-orange-700 mb-1">• {warning}</div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration praticien CHU Maurice */}
      <Card className="border-2 border-blue-200">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-blue-600" />
            Praticien CHU Maurice (Modifiable)
            <Badge variant="outline" className="ml-auto bg-blue-100 text-blue-800">
              {isFromTibok ? 'TIBOK' : 'Niveau Universitaire'}
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
                autoComplete="off"
                spellCheck="false"
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
                <option value="Médecin Spécialiste">Médecin Spécialiste</option>
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
                <option value="Jawaharlal Nehru Hospital">Jawaharlal Nehru Hospital</option>
                <option value="Flacq Hospital">Flacq Hospital</option>
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
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="academicTitle">Titre universitaire</Label>
              <Input
                id="academicTitle"
                value={mauritianDoctorInfo.academicTitle}
                onChange={(e) => handleDoctorChange("academicTitle", e.target.value)}
                className="mt-1"
                placeholder="Professeur des Universités - Praticien Hospitalier"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration sections rapport */}
      <Card className="border-2 border-green-200">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-green-600" />
            Sections Rapport CHU
            {diagnosisAPI.success && (
              <Badge variant="outline" className="bg-purple-100 text-purple-800 text-xs">
                IA Enhanced
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(reportSections).map(([key, value]) => (
              <label key={key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => handleSectionToggle(key, e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Document médical CHU Maurice */}
      <div className="bg-white p-8 rounded-lg shadow-lg print:shadow-none print:p-6">
        {/* En-tête officiel CHU Maurice */}
        <div className="text-center mb-8 print:mb-6">
          <div className="border-b-2 border-blue-600 pb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <GraduationCap className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-blue-800">COMPTE-RENDU DE CONSULTATION CHU</h1>
              {diagnosisAPI.success && (
                <Badge className="bg-purple-100 text-purple-800 text-xs">
                  IA Enhanced
                </Badge>
              )}
              {isFromTibok && (
                <Badge className="bg-blue-100 text-blue-800 text-xs">
                  TIBOK
                </Badge>
              )}
            </div>
            <h2 className="text-lg font-semibold text-blue-700 mb-3">République de Maurice • Centre Hospitalier Universitaire</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="text-left">
                <p className="font-semibold text-lg">{mauritianDoctorInfo.title} {mauritianDoctorInfo.name}</p>
                <p className="text-blue-700">{mauritianDoctorInfo.specialty}</p>
                <p className="font-medium">{mauritianDoctorInfo.chuAffiliation}</p>
                <p>{mauritianDoctorInfo.department}</p>
                <p>{mauritianDoctorInfo.address}</p>
                <p>Tél: {mauritianDoctorInfo.phone}</p>
                <p className="text-xs mt-1">{mauritianDoctorInfo.academicTitle}</p>
              </div>
              <div className="text-right">
                <p><strong>N° Conseil Médical:</strong> {mauritianDoctorInfo.mauritianMedicalCouncil}</p>
                <p><strong>Université:</strong> {mauritianDoctorInfo.universityAffiliation}</p>
                <div className="mt-2">
                  {mauritianDoctorInfo.expertise?.map(expertise => (
                    <Badge key={expertise} variant="outline" className="mr-1 mb-1 text-xs">
                      {expertise}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-1 mt-2">
                  <MapPin className="h-3 w-3 text-blue-600" />
                  <span className="text-xs text-blue-700">Maurice, Océan Indien</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Informations consultation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-sm">
          <div>
            <Label htmlFor="consultDate">Date consultation</Label>
            <div className="flex items-center gap-1 mt-1">
              <Calendar className="h-3 w-3 text-gray-500" />
              <Input
                id="consultDate"
                value={mauritianReportData.consultationDate}
                onChange={(e) => handleReportChange("consultationDate", e.target.value)}
                className="text-xs"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="consultTime">Heure</Label>
            <div className="flex items-center gap-1 mt-1">
              <Clock className="h-3 w-3 text-gray-500" />
              <Input
                id="consultTime"
                value={mauritianReportData.consultationTime}
                onChange={(e) => handleReportChange("consultationTime", e.target.value)}
                className="text-xs"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
          </div>
          <div>
            <Label>Type consultation</Label>
            <div className="mt-1">
              <Badge variant="outline" className="bg-green-100 text-green-800">
                {mauritianReportData.consultationType}
              </Badge>
            </div>
          </div>
          <div>
            <Label>Niveau preuve</Label>
            <div className="mt-1">
              <Badge className={getEvidenceLevelColor(mauritianReportData.evidenceLevel)}>
                Evidence Level {mauritianReportData.evidenceLevel}
              </Badge>
            </div>
          </div>
        </div>

        {/* Informations patient mauricien */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
            <User className="h-5 w-5 mr-2" />
            PATIENT MAURICIEN
          </h2>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <strong>Nom:</strong> {patientMauritianData?.firstName} {patientMauritianData?.lastName}
              </div>
              <div>
                <strong>Âge:</strong> {patientMauritianData?.age} ans
              </div>
              <div>
                <strong>Sexe:</strong> {patientMauritianData?.gender}
              </div>
              <div>
                <strong>Origine:</strong> {patientMauritianData?.ethnicity?.replace('-', ' ')}
              </div>
              <div>
                <strong>Région:</strong> {patientMauritianData?.region?.replace('_', ' ')}
              </div>
              <div>
                <strong>Langues:</strong> {patientMauritianData?.languages?.join(', ')}
              </div>
              <div>
                <strong>Poids:</strong> {patientMauritianData?.weight} kg
              </div>
              <div>
                <strong>Assurance:</strong> {patientMauritianData?.insuranceType}
              </div>
            </div>
            
            {patientMauritianData?.allergies?.length > 0 && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                  <strong className="text-red-800">ALLERGIES DOCUMENTÉES:</strong>
                </div>
                <p className="text-sm text-red-700 mt-1">
                  {patientMauritianData.allergies.join(', ')}
                </p>
              </div>
            )}

            {patientMauritianData?.travelHistory?.length > 0 && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <strong className="text-yellow-800">Voyages récents:</strong>
                <p className="text-sm text-yellow-700 mt-1">
                  {patientMauritianData.travelHistory.map((travel: any) => 
                    `${travel.destination} (${travel.dates?.from} - ${travel.dates?.to})`
                  ).join(', ')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Contexte tropical mauricien */}
        {reportSections.showTropicalContext && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <Thermometer className="h-5 w-5 mr-2" />
              CONTEXTE TROPICAL MAURICIEN
            </h2>
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Saison:</strong> {mauritianReportData.seasonalContext}
                </div>
                <div>
                  <strong>Alertes:</strong> {mauritianReportData.tropicalAlert}
                </div>
                <div>
                  <strong>Exposition vectorielle:</strong> {tropicalClinicalData?.vectorExposure?.mosquitoBites || 'Non documentée'}
                </div>
                <div>
                  <strong>Contact eau:</strong> {tropicalClinicalData?.vectorExposure?.waterContact ? 'Oui' : 'Non'}
                </div>
              </div>
            </div>
          </div>
        )}

        <Separator className="my-6" />

        {/* Motif de consultation */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
            <Stethoscope className="h-5 w-5 mr-2" />
            MOTIF DE CONSULTATION
          </h2>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="font-semibold text-blue-800">{tropicalClinicalData?.chiefComplaint}</p>
            {tropicalClinicalData?.historyOfPresentIllness && (
              <p className="text-sm text-blue-700 mt-2">{tropicalClinicalData.historyOfPresentIllness}</p>
            )}
          </div>
        </div>

        {/* Examen physique tropical */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3">EXAMEN PHYSIQUE TROPICAL</h2>
          <div className="space-y-3">
            <div className="bg-green-50 p-3 rounded">
              <h3 className="font-semibold text-green-800 mb-2">Signes vitaux</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <strong>TA:</strong> {tropicalClinicalData?.vitalSigns?.bloodPressure?.systolic}/{tropicalClinicalData?.vitalSigns?.bloodPressure?.diastolic} mmHg
                </div>
                <div>
                  <strong>FC:</strong> {tropicalClinicalData?.vitalSigns?.heartRate} bpm
                </div>
                <div>
                  <strong>T°:</strong> {tropicalClinicalData?.vitalSigns?.temperature}°C
                </div>
                <div>
                  <strong>SpO2:</strong> {tropicalClinicalData?.vitalSigns?.oxygenSaturation}%
                </div>
                <div>
                  <strong>FR:</strong> {tropicalClinicalData?.vitalSigns?.respiratoryRate}/min
                </div>
                <div>
                  <strong>Douleur:</strong> {tropicalClinicalData?.painScale || "Non évaluée"}/10
                </div>
              </div>
            </div>

            {/* Revue des systèmes tropicale */}
            {tropicalClinicalData?.reviewOfSystems && (
              <div className="bg-yellow-50 p-3 rounded">
                <h3 className="font-semibold text-yellow-800 mb-2">Revue des systèmes tropicaux</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  <div>Fièvre: {tropicalClinicalData.reviewOfSystems.fever ? '✓' : '✗'}</div>
                  <div>Céphalées: {tropicalClinicalData.reviewOfSystems.headache ? '✓' : '✗'}</div>
                  <div>Éruption: {tropicalClinicalData.reviewOfSystems.rash ? '✓' : '✗'}</div>
                  <div>Arthralgies: {tropicalClinicalData.reviewOfSystems.jointPains ? '✓' : '✗'}</div>
                  <div>Myalgies: {tropicalClinicalData.reviewOfSystems.musclePains ? '✓' : '✗'}</div>
                  <div>Troubles digestifs: {tropicalClinicalData.reviewOfSystems.nausea || tropicalClinicalData.reviewOfSystems.vomiting ? '✓' : '✗'}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        <Separator className="my-6" />

        {/* Diagnostic expert CHU */}
        {expertDiagnosisData && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <Brain className="h-5 w-5 mr-2" />
              DIAGNOSTIC EXPERT CHU
              {diagnosisAPI.success && (
                <Badge className="ml-2 bg-purple-100 text-purple-800 text-xs">
                  IA Enhanced
                </Badge>
              )}
            </h2>
            <div className="space-y-4">
              {/* Diagnostic principal */}
              {expertDiagnosisData.comprehensiveDiagnosis?.primary && (
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-purple-800">Diagnostic Principal</h3>
                      <p className="text-lg font-medium text-purple-900">
                        {expertDiagnosisData.comprehensiveDiagnosis.primary.condition}
                      </p>
                      <p className="text-sm text-purple-700">
                        Code ICD-11: {expertDiagnosisData.comprehensiveDiagnosis.primary.icd11 || expertDiagnosisData.comprehensiveDiagnosis.primary.icd10}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={getConfidenceColor(expertDiagnosisData.comprehensiveDiagnosis.primary.confidence)}>
                        {expertDiagnosisData.comprehensiveDiagnosis.primary.confidence}%
                      </Badge>
                      <p className="text-xs text-purple-600 mt-1">
                        Sévérité: {expertDiagnosisData.comprehensiveDiagnosis.primary.severity}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-purple-700 mt-2">
                    <strong>Justification:</strong> {expertDiagnosisData.comprehensiveDiagnosis.primary.rationale}
                  </p>
                </div>
              )}

              {/* Raisonnement diagnostique CHU */}
              {reportSections.showDiagnosticReasoning && expertDiagnosisData.expertAnalysis && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-800 mb-2">Raisonnement Clinique CHU</h3>
                  <p className="text-sm text-blue-700">
                    {expertDiagnosisData.expertAnalysis.academicReasoning}
                  </p>
                  {expertDiagnosisData.expertAnalysis.universitySemiology && (
                    <div className="mt-2">
                      <strong className="text-blue-800">Sémiologie:</strong>
                      <p className="text-sm text-blue-700">
                        {expertDiagnosisData.expertAnalysis.universitySemiology.primarySigns}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Diagnostic différentiel */}
              {expertDiagnosisData.comprehensiveDiagnosis?.systematicDifferential && (
                <div>
                  <h3 className="font-semibold mb-2">Diagnostic Différentiel Systématique</h3>
                  <div className="space-y-2">
                    {expertDiagnosisData.comprehensiveDiagnosis.systematicDifferential.slice(0, 3).map((diag: any, index: number) => (
                      <div key={index} className="border-l-4 border-blue-500 pl-4 py-2 bg-white rounded border">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">{diag.condition}</p>
                            <p className="text-sm text-gray-600">Rang {diag.rank} • {diag.rationale}</p>
                            {diag.excludingFactors && (
                              <p className="text-xs text-gray-500 mt-1">
                                Exclusion: {diag.excludingFactors.join(', ')}
                              </p>
                            )}
                          </div>
                          <Badge variant="outline">
                            {diag.probability}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Evidence-based */}
        {reportSections.showEvidenceBased && pubmedData?.studies && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              EVIDENCE-BASED MEDICINE
            </h2>
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <strong>Études analysées:</strong> {pubmedData.studies.length}
                </div>
                <div>
                  <strong>Niveau preuve:</strong> {mauritianReportData.evidenceLevel}
                </div>
                <div>
                  <strong>Pertinence Maurice:</strong> {pubmedData.mauritianContext?.applicableStudies || 0} études
                </div>
              </div>
              {pubmedData.clinicalSynthesis?.evidence_pyramid && (
                <div className="mt-3">
                  <strong className="text-purple-800">Pyramide des preuves:</strong>
                  <div className="text-sm text-purple-700 mt-1">
                    Méta-analyses: {pubmedData.clinicalSynthesis.evidence_pyramid['Systematic Reviews/Meta-analyses'] || 0} • 
                    RCT: {pubmedData.clinicalSynthesis.evidence_pyramid['Randomized Controlled Trials'] || 0} • 
                    Cohortes: {pubmedData.clinicalSynthesis.evidence_pyramid['Cohort Studies'] || 0}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Prescription CHU */}
        {drugVerificationData?.medications && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <Pill className="h-5 w-5 mr-2" />
              TRAITEMENT PRESCRIT CHU
            </h2>
            <div className="space-y-3">
              {drugVerificationData.medications.slice(0, 5).map((med: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-semibold">{med.medication}</div>
                      <div className="text-sm text-gray-600">
                        DCI: {med.drugInfo?.internationalName || med.medication}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Badge className="bg-green-100 text-green-800" size="sm">
                        {med.mauritianSpecifics?.availability || 'Public'}
                      </Badge>
                      <Badge variant="outline" size="sm">
                        {med.drugInfo?.evidenceLevel || 'B'}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-sm space-y-1">
                    <div><strong>Posologie:</strong> {med.adaptedDosing?.recommended?.standard || 'Selon protocole'}</div>
                    {med.monitoring?.clinicalSigns?.length > 0 && (
                      <div><strong>Surveillance:</strong> {med.monitoring.clinicalSigns.join(', ')}</div>
                    )}
                    {med.clinicalNotes?.length > 0 && (
                      <div><strong>Notes CHU:</strong> {med.clinicalNotes.join('; ')}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Examens prescrits */}
        {(biologyData || imagingData) && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <Microscope className="h-5 w-5 mr-2" />
              EXAMENS COMPLÉMENTAIRES CHU
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {biologyData && (
                <div className="bg-green-50 p-3 rounded border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-2 flex items-center">
                    <Database className="h-4 w-4 mr-1" />
                    Examens Biologiques
                  </h3>
                  <div className="text-sm text-green-700">
                    <div>Examens sélectionnés: {Object.values(biologyData.selectedExams || {}).filter(Boolean).length}</div>
                    <div>Coût estimé: Rs {biologyData.costs?.estimated || 0}</div>
                    <div>Urgence: {biologyData.context?.urgency || 'Standard'}</div>
                  </div>
                </div>
              )}
              
              {imagingData && (
                <div className="bg-blue-50 p-3 rounded border border-blue-200">
                  <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
                    <Camera className="h-4 w-4 mr-1" />
                    Imagerie Médicale
                  </h3>
                  <div className="text-sm text-blue-700">
                    <div>Examens sélectionnés: {Object.values(imagingData.selectedExams || {}).filter(Boolean).length}</div>
                    <div>Coût estimé: Rs {imagingData.costs?.estimated || 0}</div>
                    <div>Centre: {imagingData.costs?.preference || 'Public'}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes télémédecine */}
        {reportSections.showTeleMedNotes && telemedicineData && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <Wifi className="h-5 w-5 mr-2" />
              TÉLÉMÉDECINE CHU MAURICE
            </h2>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><strong>Type:</strong> {telemedicineData.consultationType}</div>
                <div><strong>Qualité connexion:</strong> {telemedicineData.connectionQuality}</div>
                <div><strong>Distance hôpital:</strong> {telemedicineData.distanceToHospital} km</div>
                <div><strong>Assistant présent:</strong> {telemedicineData.assistantPresent ? 'Oui' : 'Non'}</div>
              </div>
              <div className="mt-3">
                <strong>Appareils disponibles:</strong> {telemedicineData.availableDevices?.join(', ')}
              </div>
            </div>
          </div>
        )}

        {/* Spécificités mauriciennes - IA Enhanced */}
        {reportSections.showMauritianSpecifics && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              SPÉCIFICITÉS MAURICIENNES
              {aiGeneratedContent.mauritianSpecifics && (
                <Badge className="ml-2 bg-purple-100 text-purple-800 text-xs">
                  IA Generated
                </Badge>
              )}
            </h2>
            <div className="space-y-3">
              <Textarea
                value={mauritianReportData.mauritianSpecifics}
                onChange={(e) => handleReportChange("mauritianSpecifics", e.target.value)}
                placeholder="Adaptations spécifiques au contexte mauricien, considérations ethniques, facteurs tropicaux..."
                rows={6}
                className="w-full"
                autoComplete="off"
                spellCheck="false"
              />
              <Textarea
                value={mauritianReportData.culturalConsiderations}
                onChange={(e) => handleReportChange("culturalConsiderations", e.target.value)}
                placeholder="Considérations culturelles, linguistiques, familiales..."
                rows={4}
                className="w-full"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
          </div>
        )}

        {/* Enseignement médical - IA Enhanced */}
        {reportSections.showTeachingPoints && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <Award className="h-5 w-5 mr-2" />
              POINTS D'ENSEIGNEMENT CHU
              {aiGeneratedContent.teachingPoints && (
                <Badge className="ml-2 bg-purple-100 text-purple-800 text-xs">
                  IA Generated
                </Badge>
              )}
            </h2>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
              <Textarea
                value={mauritianReportData.teachingNotes}
                onChange={(e) => handleReportChange("teachingNotes", e.target.value)}
                placeholder="Points d'enseignement pour internes/résidents, aspects pédagogiques du cas, références bibliographiques..."
                rows={8}
                className="w-full"
                autoComplete="off"
                spellCheck="false"
              />
              {expertDiagnosisData?.qualityMetrics_CHU?.academicTeaching && (
                <div className="mt-2 text-sm text-yellow-700">
                  <strong>Valeur pédagogique:</strong> {expertDiagnosisData.qualityMetrics_CHU.academicTeaching}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes recherche - IA Enhanced */}
        {reportSections.showResearchAspects && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
              <Target className="h-5 w-5 mr-2" />
              ASPECTS RECHERCHE CHU
              {aiGeneratedContent.researchNotes && (
                <Badge className="ml-2 bg-purple-100 text-purple-800 text-xs">
                  IA Generated
                </Badge>
              )}
            </h2>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <Textarea
                value={mauritianReportData.researchNotes}
                onChange={(e) => handleReportChange("researchNotes", e.target.value)}
                placeholder="Opportunités recherche, publications potentielles, collaborations, financement..."
                rows={6}
                className="w-full"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
          </div>
        )}

        {/* Plan de suivi - IA Enhanced */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
            <Heart className="h-5 w-5 mr-2" />
            PLAN DE SUIVI CHU
            {aiGeneratedContent.followUpPlan && (
              <Badge className="ml-2 bg-purple-100 text-purple-800 text-xs">
                IA Generated
              </Badge>
            )}
          </h2>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <Textarea
              value={mauritianReportData.followUpPlan}
              onChange={(e) => handleReportChange("followUpPlan", e.target.value)}
              placeholder="Plan de suivi, contrôles à programmer, signes d'alarme, coordonnées urgence..."
              rows={6}
              className="w-full"
              autoComplete="off"
              spellCheck="false"
            />
            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-red-600" />
                <strong className="text-red-800">Urgences Maurice:</strong>
              </div>
              <p className="text-sm text-red-700 mt-1">{mauritianReportData.emergencyContacts}</p>
            </div>
          </div>
        </div>

        {/* Notes additionnelles */}
        <div className="mb-6">
          <Label htmlFor="additionalNotes">Notes Complémentaires CHU</Label>
          <Textarea
            id="additionalNotes"
            value={mauritianReportData.additionalNotes}
            onChange={(e) => handleReportChange("additionalNotes", e.target.value)}
            placeholder="Notes complémentaires, observations particulières, aspects de recherche..."
            rows={4}
            className="mt-1"
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        {/* Signature CHU */}
        <div className="mt-8 pt-6 border-t border-gray-300">
          <div className="flex justify-between items-end">
            <div className="text-sm">
              <p><strong>Date:</strong> {mauritianReportData.consultationDate}</p>
              <p><strong>Heure:</strong> {mauritianReportData.consultationTime}</p>
              <p><strong>Type:</strong> {mauritianReportData.consultationType}</p>
              <p><strong>Evidence Level:</strong> {mauritianReportData.evidenceLevel}</p>
              {diagnosisAPI.success && (
                <p className="text-purple-600 font-semibold mt-2">🤖 IA Enhanced Report</p>
              )}
              {isFromTibok && (
                <p className="text-blue-600 font-semibold">🏥 TIBOK Integration</p>
              )}
              {emergencyAlert && (
                <p className="text-red-600 font-semibold mt-2">⚠️ {emergencyAlert}</p>
              )}
            </div>
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2 mt-8 w-64">
                <p className="text-sm font-semibold">{mauritianDoctorInfo.title}</p>
                <p className="text-sm font-semibold">{mauritianDoctorInfo.name}</p>
                <p className="text-xs text-gray-600">{mauritianDoctorInfo.specialty}</p>
                <p className="text-xs text-gray-600">{mauritianDoctorInfo.chuAffiliation}</p>
                <p className="text-xs text-gray-600">Signature et cachet CHU</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <MapPin className="h-3 w-3 text-blue-600" />
                  <span className="text-xs text-blue-600">Maurice, Océan Indien</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* QR Code traçabilité */}
        <div className="mt-4 text-center">
          <div className="inline-block p-2 border border-gray-300 rounded">
            <div className="w-16 h-16 bg-gray-200 flex items-center justify-center text-xs">
              QR Code
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Traçabilité CHU • Rapport ID: MU-CHU-{Date.now()}
            {diagnosisAPI.success && " • IA Enhanced"}
            {isFromTibok && " • TIBOK"}
          </p>
        </div>
      </div>

      {/* Actions - Updated with TIBOK save functionality */}
      <div className="mt-6 flex justify-between">
        <div className="flex gap-3">
          <Button
            onClick={generateCHUReport}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center font-semibold"
          >
            <GraduationCap className="h-5 w-5 mr-2" />
            Générer Rapport CHU
            {diagnosisAPI.success && " + IA"}
          </Button>
          
          {isFromTibok && (
            <Button
              onClick={saveReportToTibok}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center font-semibold"
            >
              <FileText className="h-5 w-5 mr-2" />
              Sauvegarder dans TIBOK
            </Button>
          )}
        </div>

        <div className="flex space-x-3">
          <Button className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center">
            <Download className="h-4 w-4 mr-2" />
            PDF Maurice
          </Button>
          <Button className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center">
            <Printer className="h-4 w-4 mr-2" />
            Imprimer CHU
          </Button>
        </div>
      </div>
    </div>
  )
}
