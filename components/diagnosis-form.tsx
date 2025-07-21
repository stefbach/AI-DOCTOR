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

interface DiagnosisFormProps {
  patientData: any
  clinicalData: any
  questionsData: any
  onDataChange: (data: any) => void
  onNext: () => void
  onPrevious: () => void
}

export default function CompleteDiagnosisForm({
  patientData,
  clinicalData,
  questionsData,
  onDataChange,
  onNext,
  onPrevious,
}: DiagnosisFormProps) {
  const [diagnosis, setDiagnosis] = useState<any>(null)
  const [mauritianDocuments, setMauritianDocuments] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentSection, setCurrentSection] = useState(0)
  const [documentsGenerated, setDocumentsGenerated] = useState(false)

  useEffect(() => {
    generateCompleteDiagnosisAndDocuments()
  }, [patientData, clinicalData, questionsData])

  const generateCompleteDiagnosisAndDocuments = async () => {
    if (!patientData || !clinicalData) return

    setLoading(true)
    setError(null)
    setDocumentsGenerated(false)

    try {
      console.log("🩺 Génération diagnostic complet + documents mauriciens")

      const response = await fetch("/api/openai-diagnosis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientData,
          clinicalData,
          questionsData,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Erreur API ${response.status}: ${errorText.substring(0, 100)}`)
      }

      const data = await response.json()

      if (data.success && data.diagnosis && data.mauritianDocuments) {
        setDiagnosis(data.diagnosis)
        setMauritianDocuments(data.mauritianDocuments)
        setDocumentsGenerated(true)
        
        // Transmettre au parent les données complètes
        onDataChange({ 
          diagnosis: data.diagnosis, 
          mauritianDocuments: data.mauritianDocuments,
          completeData: data 
        })
        
        console.log("✅ Diagnostic + Documents mauriciens générés")
      } else {
        throw new Error(data.error || "Format de réponse invalide")
      }

    } catch (err) {
      console.error("❌ Erreur génération complète:", err)
      setError(err instanceof Error ? err.message : "Erreur inconnue")

      // Diagnostic de fallback avec documents
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
        condition: `Syndrome clinique - ${clinicalData.chiefComplaint || "Consultation médicale"}`,
        icd10: "R53",
        confidence: 70,
        severity: "moderate",
        detailedAnalysis: "Analyse basée sur les symptômes présentés nécessitant exploration complémentaire",
        clinicalRationale: `Symptômes: ${clinicalData.chiefComplaint}. Nécessite anamnèse et examen clinique approfondis`,
        prognosis: "Évolution favorable attendue avec prise en charge appropriée"
      },
      differential: [
        {
          condition: "Syndrome viral",
          probability: 40,
          rationale: "Cause fréquente de symptômes non spécifiques"
        }
      ]
    }

    const fallbackDocuments = {
      consultation: {
        header: {
          title: "COMPTE-RENDU DE CONSULTATION MÉDICALE",
          subtitle: "République de Maurice - Médecine Générale",
          date: new Date().toLocaleDateString("fr-FR"),
          time: new Date().toLocaleTimeString("fr-FR"),
          physician: "Dr. TIBOK IA DOCTOR",
          registration: "COUNCIL-2024-IA-001"
        },
        patient: {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          age: `${patientData.age} ans`,
          address: "Adresse à compléter - Maurice",
          idNumber: "Carte d'identité mauricienne à préciser",
          weight: `${patientData.weight}kg`,
          height: `${patientData.height}cm`
        },
        content: {
          chiefComplaint: clinicalData.chiefComplaint || "Motif de consultation à préciser",
          history: `Patient de ${patientData.age} ans consultant pour ${clinicalData.chiefComplaint || "symptômes"}. Évolution depuis ${clinicalData.symptomDuration || "durée non précisée"}. ${(clinicalData.symptoms || []).join(", ") || "Symptômes à détailler"}. Retentissement fonctionnel à évaluer.`,
          examination: `Constantes: TA ${clinicalData.vitalSigns?.bloodPressureSystolic || "?"}/${clinicalData.vitalSigns?.bloodPressureDiastolic || "?"}mmHg, FC ${clinicalData.vitalSigns?.heartRate || "?"}bpm, T° ${clinicalData.vitalSigns?.temperature || "?"}°C. Douleur ${clinicalData.painScale || 0}/10. Examen général: état général ${patientData.age < 65 ? "conservé" : "à préciser"}. Examen orienté selon symptômes à compléter.`,
          diagnosis: fallbackDiagnosis.primary.condition,
          plan: "Traitement symptomatique adapté. Examens complémentaires si nécessaire. Réévaluation programmée selon évolution. Conseils hygiéno-diététiques."
        }
      },
      biology: {
        header: {
          title: "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
          subtitle: "PRESCRIPTION D'EXAMENS BIOLOGIQUES",
          date: new Date().toLocaleDateString("fr-FR"),
          number: `BIO-${Date.now()}-MU`,
          physician: "Dr. TIBOK IA DOCTOR",
          registration: "COUNCIL-2024-IA-001"
        },
        patient: {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          age: `${patientData.age} ans`,
          address: "Adresse à compléter - Maurice",
          idNumber: "Carte d'identité mauricienne à préciser"
        },
        prescriptions: [
          {
            id: 1,
            exam: "NFS + CRP",
            indication: "Bilan inflammatoire de base",
            urgency: "Semi-urgent",
            fasting: "Non",
            expectedResults: "Recherche anémie, infection, troubles hématologiques",
            sampleType: "Sang veineux",
            contraindications: "Aucune"
          },
          {
            id: 2,
            exam: "Ionogramme sanguin",
            indication: "Bilan métabolique",
            urgency: "Programmé",
            fasting: "Non", 
            expectedResults: "Équilibre électrolytique",
            sampleType: "Sang veineux",
            contraindications: "Aucune"
          }
        ]
      },
      paraclinical: {
        header: {
          title: "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
          subtitle: "PRESCRIPTION D'EXAMENS PARACLINIQUES",
          date: new Date().toLocaleDateString("fr-FR"),
          number: `PARA-${Date.now()}-MU`,
          physician: "Dr. TIBOK IA DOCTOR",
          registration: "COUNCIL-2024-IA-001"
        },
        patient: {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          age: `${patientData.age} ans`,
          address: "Adresse à compléter - Maurice",
          idNumber: "Carte d'identité mauricienne à préciser"
        },
        prescriptions: [
          {
            id: 1,
            exam: "Radiographie thoracique",
            indication: "Exploration thoracique selon symptômes",
            urgency: "Programmé",
            preparation: "Retirer objets métalliques",
            contraindications: "Grossesse (protection)",
            duration: "5 minutes"
          }
        ]
      },
      medication: {
        header: {
          title: "RÉPUBLIQUE DE MAURICE - ORDONNANCE MÉDICALE",
          subtitle: "PRESCRIPTION MÉDICAMENTEUSE",
          date: new Date().toLocaleDateString("fr-FR"),
          number: `MED-${Date.now()}-MU`,
          physician: "Dr. TIBOK IA DOCTOR",
          registration: "COUNCIL-2024-IA-001"
        },
        patient: {
          firstName: patientData.firstName,
          lastName: patientData.lastName,
          age: `${patientData.age} ans`,
          address: "Adresse à compléter - Maurice",
          idNumber: "Carte d'identité mauricienne à préciser",
          allergies: (patientData.allergies || []).join(", ") || "Aucune"
        },
        prescriptions: [
          {
            id: 1,
            dci: "Paracétamol",
            brand: "Doliprane / Efferalgan",
            dosage: patientData.age >= 65 ? "500mg" : "1g",
            frequency: "3 fois par jour si nécessaire",
            duration: "5 jours maximum",
            indication: "Traitement symptomatique douleur/fièvre",
            contraindications: (patientData.allergies || []).includes("Paracétamol") ? "ALLERGIE PATIENT" : "Insuffisance hépatique sévère",
            monitoring: "Surveillance hépatique si traitement prolongé",
            mauritianAvailability: "Disponible toutes pharmacies Maurice"
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
    { id: "primary", title: "Diagnostic principal", icon: Target },
    { id: "reasoning", title: "Raisonnement", icon: Brain },
    { id: "differential", title: "Différentiels", icon: Search },
    { id: "documents", title: "Documents générés", icon: FileText },
  ]

  // Interface de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-4">
        <div className="max-w-6xl mx-auto">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-3 text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                <Brain className="h-10 w-10 text-emerald-600" />
                Diagnostic IA Expert + Documents Mauriciens
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
                  <p className="text-2xl font-bold text-gray-800">Génération complète en cours...</p>
                  <p className="text-lg text-gray-600">Diagnostic IA expert + Documents mauriciens modifiables</p>
                  <div className="max-w-md mx-auto text-sm text-gray-500 space-y-1">
                    <div className="flex items-center justify-center gap-2">
                      <Target className="h-4 w-4" />
                      <span>Analyse diagnostique experte</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>Génération compte-rendu consultation</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <TestTube className="h-4 w-4" />
                      <span>Création ordonnances biologiques</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      <span>Création ordonnances paracliniques</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Pill className="h-4 w-4" />
                      <span>Prescription médicamenteuse sécurisée</span>
                    </div>
                  </div>
                </div>
                <Progress value={75} className="w-96 mx-auto h-3" />
                <p className="text-xs text-gray-400">Génération directe complète - Prêt pour édition !</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Interface d'erreur - condition mise à jour pour vérifier diagnosis null
  if (!diagnosis && error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6" />
                Diagnostic Temporairement Indisponible
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 text-center">
              <div className="space-y-4">
                <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto" />
                <p className="text-lg text-gray-700">Impossible de générer le diagnostic automatique.</p>
                <p className="text-sm text-gray-600">Erreur: {error}</p>
                <Button onClick={generateCompleteDiagnosisAndDocuments} className="mt-6">
                  <Brain className="h-4 w-4 mr-2" />
                  Réessayer la génération complète
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Condition supplémentaire: Si pas de loading et pas d'erreur mais diagnosis toujours null
  if (!loading && !diagnosis) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <Brain className="h-6 w-6" />
                Préparation du Diagnostic
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 text-center">
              <div className="space-y-4">
                <Brain className="h-16 w-16 text-blue-500 mx-auto" />
                <p className="text-lg text-gray-700">Initialisation en cours...</p>
                <Button onClick={generateCompleteDiagnosisAndDocuments} className="mt-6">
                  <Brain className="h-4 w-4 mr-2" />
                  Lancer la génération
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Interface principale - Diagnostic généré (seulement si diagnosis existe)
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header avec succès */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-3 text-3xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
              Diagnostic IA Expert + Documents Mauriciens Générés
            </CardTitle>
            <div className="flex justify-center gap-4 mt-4">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300">
                Confiance IA: {diagnosis?.primary?.confidence || 70}%
              </Badge>
              {documentsGenerated && (
                <Badge className="bg-blue-500 text-white">
                  4 Documents Mauriciens Prêts
                </Badge>
              )}
              {error && <Badge variant="destructive">Mode Fallback Activé</Badge>}
            </div>
          </CardHeader>
        </Card>

        {/* Alert pour mode fallback */}
        {error && (
          <Card className="bg-amber-50/80 backdrop-blur-sm border-amber-200 shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-amber-800">
                <AlertTriangle className="h-5 w-5" />
                <span className="text-sm font-medium">
                  ⚠️ Diagnostic IA Expert indisponible. Analyse générique + Documents de base générés pour assurer la continuité.
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation par sections */}
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

        {/* Diagnostic Principal */}
        <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-3">
              <Target className="h-6 w-6" />
              Diagnostic Principal Retenu
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="text-center p-6 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border-2 border-emerald-200">
              <h3 className="text-2xl font-bold text-emerald-800 mb-4">
                {diagnosis?.primary?.condition || "Diagnostic à préciser"}
              </h3>
              <div className="flex justify-center gap-4">
                <Badge className="bg-emerald-100 text-emerald-800 text-sm px-4 py-2">
                  Probabilité: {diagnosis?.primary?.confidence || 70}%
                </Badge>
                <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-sm px-4 py-2">
                  Sévérité: {diagnosis?.primary?.severity || "À évaluer"}
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
                  Analyse Détaillée
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
                  Raisonnement Clinique
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

        {/* Diagnostics Différentiels */}
        {diagnosis?.differential && diagnosis.differential.length > 0 && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <Search className="h-6 w-6" />
                Diagnostics Différentiels
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
                        <span className="font-medium text-purple-700">Éléments distinctifs: </span>
                        <span className="text-sm text-purple-600">{diff.distinguishingFeatures}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents Mauriciens Générés */}
        {documentsGenerated && mauritianDocuments && (
          <Card className="bg-white/90 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center gap-3">
                <FileText className="h-6 w-6" />
                Documents Mauriciens Générés et Modifiables
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                
                {/* Consultation */}
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <FileText className="h-8 w-8 text-blue-600" />
                    <div>
                      <h3 className="font-semibold text-blue-800">Compte-rendu de Consultation</h3>
                      <p className="text-sm text-blue-600">Document professionnel mauricien</p>
                    </div>
                  </div>
                  <div className="text-xs text-blue-700 space-y-1">
                    <p><strong>Patient:</strong> {mauritianDocuments.consultation?.patient?.firstName} {mauritianDocuments.consultation?.patient?.lastName}</p>
                    <p><strong>Diagnostic:</strong> {mauritianDocuments.consultation?.content?.diagnosis || diagnosis?.primary?.condition}</p>
                  </div>
                </div>

                {/* Examens Biologiques */}
                <div className="bg-red-50 p-6 rounded-lg border border-red-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <TestTube className="h-8 w-8 text-red-600" />
                    <div>
                      <h3 className="font-semibold text-red-800">Ordonnance Examens Biologiques</h3>
                      <p className="text-sm text-red-600">Prescription laboratoire Maurice</p>
                    </div>
                  </div>
                  <div className="text-xs text-red-700">
                    <p><strong>Examens:</strong> {mauritianDocuments.biology?.prescriptions?.length || 0} prescription(s)</p>
                    <p><strong>Format:</strong> Conforme réglementation mauricienne</p>
                  </div>
                </div>

                {/* Examens Paracliniques */}
                <div className="bg-green-50 p-6 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <Stethoscope className="h-8 w-8 text-green-600" />
                    <div>
                      <h3 className="font-semibold text-green-800">Examens Paracliniques</h3>
                      <p className="text-sm text-green-600">Imagerie et explorations</p>
                    </div>
                  </div>
                  <div className="text-xs text-green-700">
                    <p><strong>Examens:</strong> {mauritianDocuments.paraclinical?.prescriptions?.length || 0} prescription(s)</p>
                  </div>
                </div>

                {/* Médicaments */}
                <div className="bg-purple-50 p-6 rounded-lg border border-purple-200 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <Pill className="h-8 w-8 text-purple-600" />
                    <div>
                      <h3 className="font-semibold text-purple-800">Ordonnance Médicamenteuse</h3>
                      <p className="text-sm text-purple-600">Prescription sécurisée Maurice</p>
                    </div>
                  </div>
                  <div className="text-xs text-purple-700">
                    <p><strong>Médicaments:</strong> {mauritianDocuments.medication?.prescriptions?.length || 0} prescription(s)</p>
                    <p><strong>Sécurité:</strong> Vérifications allergies incluses</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-100 p-4 rounded-lg border border-blue-300">
                <div className="flex items-center gap-2 mb-2">
                  <Edit3 className="h-5 w-5 text-blue-600" />
                  <span className="font-semibold text-blue-800">Documents Entièrement Modifiables</span>
                </div>
                <p className="text-sm text-blue-700">
                  Tous les documents sont entièrement modifiables. Vous pouvez éditer chaque champ selon vos besoins avant impression/téléchargement.
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
            Retour aux Questions IA
          </Button>

          {documentsGenerated ? (
            <Button 
              onClick={onNext}
              className="bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-700 hover:to-emerald-700 text-white px-8 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Edit3 className="h-4 w-4 mr-2" />
              Éditer les Documents Mauriciens
            </Button>
          ) : (
            <Button 
              onClick={generateCompleteDiagnosisAndDocuments}
              className="bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700 text-white px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Brain className="h-4 w-4 mr-2" />
              Générer Diagnostic + Documents
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
