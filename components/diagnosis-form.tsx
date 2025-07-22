"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  ArrowLeft, 
  Brain, 
  Loader2, 
  CheckCircle, 
  AlertTriangle,
  Target,
  Search,
  Eye,
  FileText,
  TestTube,
  Pill,
  Stethoscope,
  Edit3
} from "lucide-react"
import { getTranslation, Language } from "@/lib/translations"

interface DiagnosisFormProps {
  patientData: any
  clinicalData: any
  questionsData: any
  onDataChange: (data: any) => void
  onNext: () => void
  onPrevious: () => void
  language?: Language
}

export default function CompleteDiagnosisForm({
  patientData,
  clinicalData,
  questionsData,
  onDataChange,
  onNext,
  onPrevious,
  language = 'fr'
}: DiagnosisFormProps) {
  const [diagnosis, setDiagnosis] = useState<any>(null)
  const [mauritianDocuments, setMauritianDocuments] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentSection, setCurrentSection] = useState(0)
  const [documentsGenerated, setDocumentsGenerated] = useState(false)

  // Helper function for translations
  const t = (key: string) => getTranslation(key, language)

  useEffect(() => {
    generateCompleteDiagnosisAndDocuments()
  }, [patientData, clinicalData, questionsData])

  const generateCompleteDiagnosisAndDocuments = async () => {
    if (!patientData || !clinicalData) return

    setLoading(true)
    setError(null)
    setDocumentsGenerated(false)

    try {
      console.log("🩺 Generating complete diagnosis + documents")

      const response = await fetch("/api/openai-diagnosis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientData,
          clinicalData,
          questionsData,
          language, // Pass language for localized generation
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error ${response.status}: ${errorText.substring(0, 100)}`)
      }

      const data = await response.json()

      if (data.success && data.diagnosis && data.mauritianDocuments) {
        setDiagnosis(data.diagnosis)
        setMauritianDocuments(data.mauritianDocuments)
        setDocumentsGenerated(true)
        
        // Pass complete data to parent
        onDataChange({ 
          diagnosis: data.diagnosis, 
          mauritianDocuments: data.mauritianDocuments,
          completeData: data 
        })
        
        console.log("✅ Diagnosis + Documents generated")
      } else {
        throw new Error(data.error || (language === 'fr' ? "Format de réponse invalide" : "Invalid response format"))
      }

    } catch (err) {
      console.error("❌ Generation error:", err)
      setError(err instanceof Error ? err.message : (language === 'fr' ? "Erreur inconnue" : "Unknown error"))

      // Generate fallback data
      const fallbackData = generateCompleteFallback()
      setDiagnosis(fallbackData.diagnosis)
      setMauritianDocuments(fallbackData.mauritianDocuments)
      setDocumentsGenerated(true)
      onDataChange(fallbackData)
      
    } finally {
      setLoading(false)
    }
  }

  const generateCompleteFallback = () => {
    const fallbackDiagnosis = {
      primary: {
        condition: language === 'fr' 
          ? `Syndrome clinique - ${clinicalData.chiefComplaint || "Consultation médicale"}`
          : `Clinical syndrome - ${clinicalData.chiefComplaint || "Medical consultation"}`,
        icd10: "R53",
        confidence: 70,
        severity: "moderate",
        detailedAnalysis: language === 'fr'
          ? "Analyse basée sur les symptômes présentés nécessitant exploration complémentaire"
          : "Analysis based on presented symptoms requiring further investigation",
        clinicalRationale: language === 'fr'
          ? `Symptômes: ${clinicalData.chiefComplaint}. Nécessite anamnèse et examen clinique approfondis`
          : `Symptoms: ${clinicalData.chiefComplaint}. Requires thorough history and clinical examination`,
        prognosis: language === 'fr'
          ? "Évolution favorable attendue avec prise en charge appropriée"
          : "Favorable outcome expected with appropriate management"
      },
      differential: [
        {
          condition: language === 'fr' ? "Syndrome viral" : "Viral syndrome",
          probability: 40,
          rationale: language === 'fr' 
            ? "Cause fréquente de symptômes non spécifiques"
            : "Common cause of non-specific symptoms"
        }
      ]
    }

    const dateFormat = language === 'fr' 
      ? new Date().toLocaleDateString("fr-FR")
      : new Date().toLocaleDateString("en-US")

    const fallbackDocuments = {
      consultation: {
        header: {
          title: language === 'fr' 
            ? "COMPTE-RENDU DE CONSULTATION MÉDICALE"
            : "MEDICAL CONSULTATION REPORT",
          subtitle: language === 'fr'
            ? "République de Maurice - Médecine Générale"
            : "Republic of Mauritius - General Medicine",
          date: dateFormat,
          time: new Date().toLocaleTimeString(language === 'fr' ? "fr-FR" : "en-US"),
          physician: "Dr. TIBOK IA DOCTOR",
          registration: "COUNCIL-2024-IA-001"
        },
        patient: {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          age: `${patientData.age} ${language === 'fr' ? 'ans' : 'years'}`,
          address: language === 'fr' 
            ? "Adresse à compléter - Maurice"
            : "Address to be completed - Mauritius",
          idNumber: language === 'fr'
            ? "Carte d'identité mauricienne à préciser"
            : "Mauritian ID card to be specified",
          weight: `${patientData.weight}kg`,
          height: `${patientData.height}cm`
        },
        content: {
          chiefComplaint: clinicalData.chiefComplaint || (language === 'fr' ? "Motif de consultation à préciser" : "Chief complaint to be specified"),
          history: language === 'fr'
            ? `Patient de ${patientData.age} ans consultant pour ${clinicalData.chiefComplaint || "symptômes"}. Évolution depuis ${clinicalData.symptomDuration || "durée non précisée"}. ${(clinicalData.symptoms || []).join(", ") || "Symptômes à détailler"}. Retentissement fonctionnel à évaluer.`
            : `${patientData.age}-year-old patient consulting for ${clinicalData.chiefComplaint || "symptoms"}. Evolution since ${clinicalData.symptomDuration || "unspecified duration"}. ${(clinicalData.symptoms || []).join(", ") || "Symptoms to be detailed"}. Functional impact to be evaluated.`,
          examination: language === 'fr'
            ? `Constantes: TA ${clinicalData.vitalSigns?.bloodPressureSystolic || "?"}/${clinicalData.vitalSigns?.bloodPressureDiastolic || "?"}mmHg, FC ${clinicalData.vitalSigns?.heartRate || "?"}bpm, T° ${clinicalData.vitalSigns?.temperature || "?"}°C. Douleur ${clinicalData.painScale || 0}/10. Examen général: état général ${patientData.age < 65 ? "conservé" : "à préciser"}. Examen orienté selon symptômes à compléter.`
            : `Vitals: BP ${clinicalData.vitalSigns?.bloodPressureSystolic || "?"}/${clinicalData.vitalSigns?.bloodPressureDiastolic || "?"}mmHg, HR ${clinicalData.vitalSigns?.heartRate || "?"}bpm, T° ${clinicalData.vitalSigns?.temperature || "?"}°C. Pain ${clinicalData.painScale || 0}/10. General examination: general condition ${patientData.age < 65 ? "preserved" : "to be specified"}. Targeted examination based on symptoms to be completed.`,
          diagnosis: fallbackDiagnosis.primary.condition,
          plan: language === 'fr'
            ? "Traitement symptomatique adapté. Examens complémentaires si nécessaire. Réévaluation programmée selon évolution. Conseils hygiéno-diététiques."
            : "Appropriate symptomatic treatment. Additional tests if necessary. Scheduled reevaluation based on evolution. Lifestyle and dietary advice."
        }
      },
      biology: {
        header: {
          title: language === 'fr' 
            ? "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE"
            : "REPUBLIC OF MAURITIUS - MEDICAL PRESCRIPTION",
          subtitle: language === 'fr'
            ? "PRESCRIPTION D'EXAMENS BIOLOGIQUES"
            : "BIOLOGICAL TESTS PRESCRIPTION",
          date: dateFormat,
          number: `BIO-${Date.now()}-MU`,
          physician: "Dr. TIBOK IA DOCTOR",
          registration: "COUNCIL-2024-IA-001"
        },
        patient: {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          age: `${patientData.age} ${language === 'fr' ? 'ans' : 'years'}`,
          address: language === 'fr' 
            ? "Adresse à compléter - Maurice"
            : "Address to be completed - Mauritius",
          idNumber: language === 'fr'
            ? "Carte d'identité mauricienne à préciser"
            : "Mauritian ID card to be specified"
        },
        prescriptions: [
          {
            id: 1,
            exam: language === 'fr' ? "NFS + CRP" : "CBC + CRP",
            indication: language === 'fr' 
              ? "Bilan inflammatoire de base"
              : "Basic inflammatory panel",
            urgency: language === 'fr' ? "Semi-urgent" : "Semi-urgent",
            fasting: language === 'fr' ? "Non" : "No",
            expectedResults: language === 'fr'
              ? "Recherche anémie, infection, troubles hématologiques"
              : "Check for anemia, infection, hematological disorders",
            sampleType: language === 'fr' ? "Sang veineux" : "Venous blood",
            contraindications: language === 'fr' ? "Aucune" : "None"
          },
          {
            id: 2,
            exam: language === 'fr' ? "Ionogramme sanguin" : "Electrolyte panel",
            indication: language === 'fr' ? "Bilan métabolique" : "Metabolic assessment",
            urgency: language === 'fr' ? "Programmé" : "Scheduled",
            fasting: language === 'fr' ? "Non" : "No", 
            expectedResults: language === 'fr' 
              ? "Équilibre électrolytique"
              : "Electrolyte balance",
            sampleType: language === 'fr' ? "Sang veineux" : "Venous blood",
            contraindications: language === 'fr' ? "Aucune" : "None"
          }
        ]
      },
      paraclinical: {
        header: {
          title: language === 'fr' 
            ? "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE"
            : "REPUBLIC OF MAURITIUS - MEDICAL PRESCRIPTION",
          subtitle: language === 'fr'
            ? "PRESCRIPTION D'EXAMENS PARACLINIQUES"
            : "PARACLINICAL TESTS PRESCRIPTION",
          date: dateFormat,
          number: `PARA-${Date.now()}-MU`,
          physician: "Dr. TIBOK IA DOCTOR",
          registration: "COUNCIL-2024-IA-001"
        },
        patient: {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          age: `${patientData.age} ${language === 'fr' ? 'ans' : 'years'}`,
          address: language === 'fr' 
            ? "Adresse à compléter - Maurice"
            : "Address to be completed - Mauritius",
          idNumber: language === 'fr'
            ? "Carte d'identité mauricienne à préciser"
            : "Mauritian ID card to be specified"
        },
        prescriptions: [
          {
            id: 1,
            exam: language === 'fr' ? "Radiographie thoracique" : "Chest X-ray",
            indication: language === 'fr' 
              ? "Exploration thoracique selon symptômes"
              : "Chest exploration based on symptoms",
            urgency: language === 'fr' ? "Programmé" : "Scheduled",
            preparation: language === 'fr' 
              ? "Retirer objets métalliques"
              : "Remove metallic objects",
            contraindications: language === 'fr' 
              ? "Grossesse (protection)"
              : "Pregnancy (protection)",
            duration: language === 'fr' ? "5 minutes" : "5 minutes"
          }
        ]
      },
      medication: {
        header: {
          title: language === 'fr' 
            ? "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE"
            : "REPUBLIC OF MAURITIUS - MEDICAL PRESCRIPTION",
          subtitle: language === 'fr'
            ? "PRESCRIPTION MÉDICAMENTEUSE"
            : "MEDICATION PRESCRIPTION",
          date: dateFormat,
          number: `MED-${Date.now()}-MU`,
          physician: "Dr. TIBOK IA DOCTOR",
          registration: "COUNCIL-2024-IA-001"
        },
        patient: {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          age: `${patientData.age} ${language === 'fr' ? 'ans' : 'years'}`,
          address: language === 'fr' 
            ? "Adresse à compléter - Maurice"
            : "Address to be completed - Mauritius",
          idNumber: language === 'fr'
            ? "Carte d'identité mauricienne à préciser"
            : "Mauritian ID card to be specified",
          allergies: (patientData.allergies || []).join(", ") || (language === 'fr' ? "Aucune" : "None")
        },
        prescriptions: [
          {
            id: 1,
            dci: language === 'fr' ? "Paracétamol" : "Paracetamol",
            brand: "Doliprane / Efferalgan",
            dosage: patientData.age >= 65 ? "500mg" : "1g",
            frequency: language === 'fr' 
              ? "3 fois par jour si nécessaire"
              : "3 times daily if needed",
            duration: language === 'fr' ? "5 jours maximum" : "Maximum 5 days",
            indication: language === 'fr' 
              ? "Traitement symptomatique douleur/fièvre"
              : "Symptomatic treatment pain/fever",
            contraindications: (patientData.allergies || []).includes("Paracétamol") 
              ? (language === 'fr' ? "ALLERGIE PATIENT" : "PATIENT ALLERGY")
              : (language === 'fr' ? "Insuffisance hépatique sévère" : "Severe hepatic impairment"),
            monitoring: language === 'fr'
              ? "Surveillance hépatique si traitement prolongé"
              : "Liver monitoring if prolonged treatment",
            mauritianAvailability: language === 'fr'
              ? "Disponible toutes pharmacies Maurice"
              : "Available all pharmacies Mauritius"
          }
        ]
      }
    }

    return {
      diagnosis: fallbackDiagnosis,
      mauritianDocuments: fallbackDocuments
    }
  }

  const sections = [
    { id: "primary", title: t('diagnosisForm.sections.primary'), icon: Target },
    { id: "reasoning", title: t('diagnosisForm.sections.reasoning'), icon: Brain },
    { id: "differential", title: t('diagnosisForm.sections.differential'), icon: Search },
    { id: "documents", title: t('diagnosisForm.sections.documents'), icon: FileText },
  ]

  // Loading interface
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-4">
        <div className="max-w-6xl mx-auto">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-3 text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                <Brain className="h-10 w-10 text-emerald-600" />
                {t('diagnosisForm.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-20">
              <div className="text-center space-y-6">
                <div className="relative">
                  <div className="w-20 h-20 mx-auto">
                    <div className="absolute inset-0 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    <div className="absolute inset-2 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin animate-reverse"></div>
                    <Brain className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-emerald-600" />
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-2xl font-bold text-gray-800">{t('diagnosisForm.generatingComplete')}</p>
                  <p className="text-lg text-gray-600">{t('diagnosisForm.generatingDescription')}</p>
                  <div className="max-w-md mx-auto text-sm text-gray-500 space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      <Target className="h-4 w-4" />
                      <span>{t('diagnosisForm.expertAnalysis')}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>{t('diagnosisForm.reportGeneration')}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <TestTube className="h-4 w-4" />
                      <span>{t('diagnosisForm.biologyPrescriptions')}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      <span>{t('diagnosisForm.paraclinicalPrescriptions')}</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Pill className="h-4 w-4" />
                      <span>{t('diagnosisForm.medicationPrescription')}</span>
                    </div>
                  </div>
                </div>
                <Progress value={75} className="w-96 mx-auto h-3" />
                <p className="text-xs text-gray-400">{t('diagnosisForm.directGeneration')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Error interface
  if (!diagnosis && error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6" />
                {t('diagnosisForm.temporarilyUnavailable')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 text-center">
              <div className="space-y-4">
                <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto" />
                <p className="text-lg text-gray-700">{t('diagnosisForm.cannotGenerate')}</p>
                <p className="text-sm text-gray-600">{t('common.error')}: {error}</p>
                <Button onClick={generateCompleteDiagnosisAndDocuments} className="mt-6">
                  <Brain className="h-4 w-4 mr-2" />
                  {t('diagnosisForm.retry')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Additional condition: No loading, no error but diagnosis still null
  if (!loading && !diagnosis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <Brain className="h-6 w-6" />
                {t('diagnosisForm.preparingDiagnosis')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 text-center">
              <div className="space-y-4">
                <Brain className="h-16 w-16 text-blue-500 mx-auto" />
                <p className="text-lg text-gray-700">{t('diagnosisForm.initializing')}</p>
                <Button onClick={generateCompleteDiagnosisAndDocuments} className="mt-6">
                  <Brain className="h-4 w-4 mr-2" />
                  {t('diagnosisForm.startGeneration')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Main interface - Generated diagnosis (only if diagnosis exists)
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Success header */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-3 text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
              {t('diagnosisForm.successTitle')}
            </CardTitle>
            <div className="flex justify-center gap-4 mt-4">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300">
                {t('diagnosisForm.aiConfidence')} {diagnosis?.primary?.confidence || 70}%
              </Badge>
              {documentsGenerated && (
                <Badge className="bg-blue-500 text-white">
                  {t('diagnosisForm.documentsReady')}
                </Badge>
              )}
              {error && <Badge variant="destructive">{t('diagnosisForm.fallbackActivated')}</Badge>}
            </div>
          </CardHeader>
        </Card>

        {/* Alert for fallback mode */}
        {error && (
          <Card className="bg-amber-50/80 backdrop-blur-sm border-amber-200 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-amber-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {t('diagnosisForm.fallbackMessage')}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section navigation */}
        <div className="flex flex-wrap gap-2 justify-center">
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => setCurrentSection(index)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200 ${
                currentSection === index
                  ? "bg-emerald-600 text-white shadow-lg"
                  : "bg-white/70 text-gray-600 hover:bg-white hover:shadow-md"
              }`}
            >
              <section.icon className="h-4 w-4" />
              <span className="text-sm font-medium">{section.title}</span>
            </button>
          ))}
        </div>

        {/* Primary Diagnosis */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <Target className="h-6 w-6" />
              {t('diagnosisForm.primaryDiagnosis')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="text-center p-6 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border-2 border-emerald-200">
              <h3 className="text-2xl font-bold text-emerald-800 mb-4">
                {diagnosis?.primary?.condition || (language === 'fr' ? "Diagnostic à préciser" : "Diagnosis to be specified")}
              </h3>
              <div className="flex justify-center gap-4">
                <Badge className="bg-emerald-100 text-emerald-800 text-sm px-4 py-2">
                  {t('diagnosisForm.probability')} {diagnosis?.primary?.confidence || 70}%
                </Badge>
                <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-sm px-4 py-2">
                  {t('diagnosisForm.severity')} {diagnosis?.primary?.severity || t('diagnosisForm.toEvaluate')}
                </Badge>
                {diagnosis?.primary?.icd10 && (
                  <Badge variant="outline" className="border-blue-300 text-blue-700 text-sm px-4 py-2">
                    CIM-10: {diagnosis.primary.icd10}
                  </Badge>
                )}
              </div>
            </div>

            {diagnosis?.primary?.detailedAnalysis && (
              <div>
                <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-emerald-600" />
                  {t('diagnosisForm.detailedAnalysis')}
                </h4>
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {diagnosis.primary.detailedAnalysis}
                  </p>
                </div>
              </div>
            )}

            {diagnosis?.primary?.clinicalRationale && (
              <div>
                <h4 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Eye className="h-5 w-5 text-emerald-600" />
                  {t('diagnosisForm.clinicalReasoning')}
                </h4>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {diagnosis.primary.clinicalRationale}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Differential Diagnoses */}
        {diagnosis?.differential && diagnosis.differential.length > 0 && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <Search className="h-6 w-6" />
                {t('diagnosisForm.differentialDiagnosis')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid gap-6">
                {diagnosis.differential.map((diff: any, index: number) => (
                  <div key={index} className="border-l-4 border-purple-400 pl-6 bg-purple-25 p-4 rounded-r-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-lg text-purple-800">{diff.condition}</h4>
                      <Badge className="bg-purple-100 text-purple-800">{diff.probability}%</Badge>
                    </div>
                    
                    {diff.rationale && (
                      <p className="text-sm text-gray-600 italic mb-2">{diff.rationale}</p>
                    )}
                    
                    {diff.distinguishingFeatures && (
                      <div className="bg-purple-50 p-3 rounded border border-purple-200">
                        <span className="font-medium text-purple-700">{t('diagnosisForm.distinguishingFeatures')} </span>
                        <span className="text-sm text-purple-600">{diff.distinguishingFeatures}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Generated Mauritian Documents */}
        {documentsGenerated && mauritianDocuments && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <FileText className="h-6 w-6" />
                {t('diagnosisForm.mauritianDocuments')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                
                {/* Consultation */}
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-blue-800">{t('diagnosisForm.consultationReport')}</h3>
                      <p className="text-sm text-blue-600">{t('diagnosisForm.professionalDocument')}</p>
                    </div>
                  </div>
                  <div className="text-xs text-blue-700 space-y-1">
                    <p><strong>{t('diagnosisForm.patient')}</strong> {mauritianDocuments.consultation?.patient?.firstName} {mauritianDocuments.consultation?.patient?.lastName}</p>
                    <p><strong>{t('diagnosisForm.diagnosis')}</strong> {mauritianDocuments.consultation?.content?.diagnosis || diagnosis?.primary?.condition}</p>
                  </div>
                </div>

                {/* Biological Exams */}
                <div className="bg-red-50 p-6 rounded-lg border border-red-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <TestTube className="h-8 w-8 text-red-600" />
                    <div>
                      <h3 className="font-semibold text-red-800">{t('diagnosisForm.biologicalExams')}</h3>
                      <p className="text-sm text-red-600">{t('diagnosisForm.labPrescription')}</p>
                    </div>
                  </div>
                  <div className="text-xs text-red-700">
                    <p><strong>{t('diagnosisForm.exams')}</strong> {mauritianDocuments.biology?.prescriptions?.length || 0} {t('diagnosisForm.prescriptions')}</p>
                    <p><strong>{t('diagnosisForm.format')}</strong> {t('diagnosisForm.mauritianCompliant')}</p>
                  </div>
                </div>

                {/* Paraclinical Exams */}
                <div className="bg-green-50 p-6 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <Stethoscope className="h-8 w-8 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-800">{t('diagnosisForm.paraclinicalExams')}</h3>
                      <p className="text-sm text-green-600">{t('diagnosisForm.imagingExplorations')}</p>
                    </div>
                  </div>
                  <div className="text-xs text-green-700">
                    <p><strong>{t('diagnosisForm.exams')}</strong> {mauritianDocuments.paraclinical?.prescriptions?.length || 0} {t('diagnosisForm.prescriptions')}</p>
                  </div>
                </div>

                {/* Medications */}
                <div className="bg-purple-50 p-6 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <Pill className="h-8 w-8 text-purple-600" />
                    <div>
                      <h3 className="font-semibold text-purple-800">{t('diagnosisForm.medicationPrescriptionTitle')}</h3>
                      <p className="text-sm text-purple-600">{t('diagnosisForm.securePrescription')}</p>
                    </div>
                  </div>
                  <div className="text-xs text-purple-700">
                    <p><strong>{t('diagnosisForm.medications')}</strong> {mauritianDocuments.medication?.prescriptions?.length || 0} {t('diagnosisForm.prescriptions')}</p>
                    <p><strong>{t('diagnosisForm.safety')}</strong> {t('diagnosisForm.allergyChecks')}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-100 p-4 rounded-lg border border-blue-300">
                <div className="flex items-center gap-2 mb-2">
                  <Edit3 className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-800">{t('diagnosisForm.fullyEditable')}</span>
                </div>
                <p className="text-sm text-blue-700">
                  {t('diagnosisForm.editableDescription')}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={onPrevious}
            className="px-6 py-3 shadow-md hover:shadow-lg transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('diagnosisForm.backToQuestions')}
          </Button>

          {documentsGenerated ? (
            <Button 
              onClick={onNext}
              className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              {t('diagnosisForm.editDocuments')}
            </Button>
          ) : (
            <Button 
              onClick={generateCompleteDiagnosisAndDocuments}
              className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Brain className="h-4 w-4 mr-2" />
              {t('diagnosisForm.generateDiagnosisDocuments')}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
