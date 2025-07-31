// components/professional-report.tsx - Version corrigée pour afficher toutes les données

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FileText, 
  Download, 
  Printer, 
  CheckCircle,
  Loader2,
  Share2,
  Pill,
  TestTube,
  Scan,
  AlertTriangle,
  XCircle,
  Eye,
  EyeOff,
} from "lucide-react"

// Types pour les prescriptions
interface MedicationItem {
  nom: string
  dci?: string
  dosage: string
  forme: string
  posologie: string
  duree: string
  quantite?: string
  remarques?: string
  nonSubstituable?: boolean
}

interface BiologyExam {
  type: string
  code?: string
  urgence: boolean
  jeun: boolean
  remarques?: string
}

interface ImagingExam {
  type: string
  region: string
  indication: string
  urgence: boolean
  contraste?: boolean
  remarques?: string
}

interface DrugInteraction {
  drug1: string
  drug2: string
  severity: 'majeure' | 'modérée' | 'mineure'
  description: string
  recommendation: string
}

interface ProfessionalReportProps {
  patientData: any
  clinicalData: any
  questionsData: any
  diagnosisData: any
  editedDocuments?: any
  onComplete?: () => void
}

export default function ProfessionalReport({
  patientData,
  clinicalData,
  questionsData,
  diagnosisData,
  editedDocuments,
  onComplete
}: ProfessionalReportProps) {
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("consultation")
  const [drugInteractions, setDrugInteractions] = useState<DrugInteraction[]>([])
  const [checkingInteractions, setCheckingInteractions] = useState(false)
  const [showFullReport, setShowFullReport] = useState(false)
  const [showInteractionsDemo, setShowInteractionsDemo] = useState(false) // Pour la démo

  useEffect(() => {
    console.log("🚀 ProfessionalReport mounted")
    generateProfessionalReport()
  }, [])

  // Vérifier les interactions médicamenteuses (optionnel)
  const checkDrugInteractions = async (medications: MedicationItem[]) => {
    // Fonctionnalité désactivée si l'API n'existe pas
    console.log("ℹ️ Vérification des interactions médicamenteuses désactivée (API non disponible)")
    
    // Si vous souhaitez implémenter cette fonctionnalité plus tard,
    // décommentez le code ci-dessous et créez l'endpoint correspondant
    
    /*
    setCheckingInteractions(true)
    try {
      const response = await fetch("/api/check-drug-interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medications: medications.map(m => ({
            name: m.nom,
            dci: m.dci,
            dosage: m.dosage
          })),
          patientData: {
            age: patientData.age,
            weight: patientData.weight,
            allergies: patientData.allergies,
            conditions: patientData.medicalHistory
          }
        })
      })

      if (response.ok) {
        const data = await response.json()
        setDrugInteractions(data.interactions || [])
      }
    } catch (error) {
      console.error("Erreur lors de la vérification des interactions:", error)
    } finally {
      setCheckingInteractions(false)
    }
    */
  }

  const generateProfessionalReport = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("📤 Envoi des données à l'API:")
      console.log("- Patient:", patientData)
      console.log("- Clinical:", clinicalData)
      console.log("- Diagnosis:", diagnosisData)
      console.log("- Edited Documents:", editedDocuments)

      const response = await fetch("/api/generate-consultation-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientData,
          clinicalData,
          questionsData,
          diagnosisData,
          editedDocuments,
          includeFullPrescriptions: true
        })
      })

      const contentType = response.headers.get("content-type") || ""
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ Erreur API:", errorText)
        throw new Error(`Erreur HTTP ${response.status}: ${errorText}`)
      }

      if (!contentType.includes("application/json")) {
        const text = await response.text()
        console.error("❌ Réponse non-JSON:", text)
        throw new Error("La réponse n'est pas au format JSON")
      }

      const data = await response.json()
      console.log("📥 Données reçues de l'API:", data)

      if (data.success && data.report) {
        console.log("✅ Rapport généré avec succès")
        console.log("📊 Structure du rapport:")
        console.log("- Sections rapport:", Object.keys(data.report.rapport || {}))
        console.log("- Médicaments:", data.report.prescriptions?.medicaments?.items?.length || 0)
        console.log("- Examens bio:", data.report.prescriptions?.biologie?.examens?.length || 0)
        console.log("- Examens imagerie:", data.report.prescriptions?.imagerie?.examens?.length || 0)
        
        setReport(data.report)
        
        // Vérifier les interactions médicamenteuses (désactivé - API non disponible)
        // if (data.report.prescriptions?.medicaments?.items?.length > 0) {
        //   await checkDrugInteractions(data.report.prescriptions.medicaments.items)
        // }
        
        if (onComplete) {
          onComplete()
        }
      } else {
        throw new Error(data.error || "Aucun rapport dans la réponse")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erreur inconnue"
      console.error("❌ Erreur génération rapport:", errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Fonction pour exporter une section
  const exportSectionToPDF = (sectionId: string, filename: string) => {
    const element = document.getElementById(sectionId)
    if (!element) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${filename}</title>
          <style>
            @page { margin: 20mm; }
            body { 
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            h1, h2, h3 { color: #2c3e50; }
            .header { text-align: center; margin-bottom: 30px; }
            .section { margin-bottom: 20px; }
            .prescription-item { 
              border-left: 4px solid #3498db; 
              padding-left: 15px; 
              margin: 15px 0;
            }
            .urgent { color: #e74c3c; font-weight: bold; }
            .info { color: #7f8c8d; font-style: italic; }
          </style>
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `

    printWindow.document.write(content)
    printWindow.document.close()
    setTimeout(() => printWindow.print(), 250)
  }

  const handlePrint = () => window.print()

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Compte rendu médical',
          text: `Compte rendu de ${patientData.lastName || patientData.nom} ${patientData.firstName || patientData.prenom}`
        })
      } catch (err) {
        console.log("Partage annulé")
      }
    }
  }

  // États de chargement et erreur
  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="text-lg font-semibold">Génération du compte rendu professionnel...</p>
            <p className="text-sm text-gray-600">Analyse des données en cours</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 w-full">
        <CardContent className="text-center py-10">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-semibold mb-2">Erreur lors de la génération</p>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <Button onClick={generateProfessionalReport} variant="outline">
            Réessayer
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!report) {
    return (
      <Card className="w-full">
        <CardContent className="text-center py-10">
          <p className="text-gray-600">En attente de génération du rapport...</p>
        </CardContent>
      </Card>
    )
  }

  // Composant pour les interactions médicamenteuses
  const DrugInteractionsAlert = () => {
    if (!drugInteractions.length) return null

    const severeInteractions = drugInteractions.filter(i => i.severity === 'majeure')
    const moderateInteractions = drugInteractions.filter(i => i.severity === 'modérée')

    return (
      <div className={`mb-6 p-4 border rounded-lg ${
        severeInteractions.length > 0 ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'
      }`}>
        <div className="flex items-start gap-2">
          <AlertTriangle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
            severeInteractions.length > 0 ? 'text-red-600' : 'text-yellow-600'
          }`} />
          <div className="flex-1">
            <div className="font-semibold mb-2">
              Interactions médicamenteuses détectées
            </div>
            {severeInteractions.length > 0 && (
              <div className="mb-3">
                <p className="font-medium text-red-700">Interactions majeures :</p>
                {severeInteractions.map((interaction, idx) => (
                  <div key={idx} className="ml-4 mt-1 text-sm">
                    <p>• {interaction.drug1} ↔ {interaction.drug2}</p>
                    <p className="text-gray-600 ml-4">{interaction.description}</p>
                    <p className="text-blue-600 ml-4 font-medium">→ {interaction.recommendation}</p>
                  </div>
                ))}
              </div>
            )}
            {moderateInteractions.length > 0 && (
              <div>
                <p className="font-medium text-yellow-700">Interactions modérées :</p>
                {moderateInteractions.map((interaction, idx) => (
                  <div key={idx} className="ml-4 mt-1 text-sm">
                    <p>• {interaction.drug1} ↔ {interaction.drug2}</p>
                    <p className="text-gray-600 ml-4">{interaction.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Composant pour le compte rendu de consultation
  const ConsultationReport = () => {
    const sections = [
      { key: 'motifConsultation', title: 'MOTIF DE CONSULTATION' },
      { key: 'anamnese', title: 'ANAMNÈSE' },
      { key: 'antecedents', title: 'ANTÉCÉDENTS' },
      { key: 'examenClinique', title: 'EXAMEN CLINIQUE' },
      { key: 'syntheseDiagnostique', title: 'SYNTHÈSE DIAGNOSTIQUE' },
      { key: 'conclusionDiagnostique', title: 'CONCLUSION DIAGNOSTIQUE' },
      { key: 'priseEnCharge', title: 'PRISE EN CHARGE' },
      { key: 'surveillance', title: 'SURVEILLANCE' },
      { key: 'conclusion', title: 'CONCLUSION' }
    ]

    return (
      <Card className="shadow-xl print:shadow-none">
        <CardContent className="p-8 print:p-12">
          {/* En-tête */}
          <div className="text-center mb-8 print:mb-12">
            <h1 className="text-2xl font-bold mb-2">{report.header.title}</h1>
            <p className="text-gray-600">{report.header.subtitle}</p>
            <p className="text-sm text-gray-500 mt-2">Référence : {report.header.reference}</p>
          </div>

          {/* Identification du patient */}
          <div className="mb-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-bold mb-2">Identification du patient</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="font-medium">Patient :</span> {report.identification.patient}</div>
              <div><span className="font-medium">Âge :</span> {report.identification.age}</div>
              <div><span className="font-medium">Sexe :</span> {report.identification.sexe}</div>
              <div><span className="font-medium">Date de naissance :</span> {report.identification.dateNaissance}</div>
              {report.identification.telephone && (
                <div><span className="font-medium">Téléphone :</span> {report.identification.telephone}</div>
              )}
              {report.identification.email && (
                <div><span className="font-medium">Email :</span> {report.identification.email}</div>
              )}
            </div>
            {report.identification.adresse && (
              <div className="mt-2">
                <span className="font-medium">Adresse :</span> {report.identification.adresse}
              </div>
            )}
          </div>

          {/* Bouton pour afficher/masquer le rapport complet */}
          <div className="mb-4 print:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFullReport(!showFullReport)}
            >
              {showFullReport ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showFullReport ? "Masquer le rapport détaillé" : "Afficher le rapport complet"}
            </Button>
          </div>

          {/* Contenu du rapport médical */}
          <div className={`prose prose-lg max-w-none space-y-6 print:text-black ${
            !showFullReport ? 'max-h-96 overflow-hidden relative' : ''
          }`}>
            {sections.map((section) => (
              report.rapport[section.key] && (
                <section key={section.key}>
                  <h2 className="text-xl font-bold text-gray-900 mb-3">{section.title}</h2>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {report.rapport[section.key]}
                  </p>
                </section>
              )
            ))}
            
            {!showFullReport && (
              <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent print:hidden" />
            )}
          </div>

          {/* Afficher toujours en impression */}
          <div className="hidden print:block">
            {sections.map((section) => (
              report.rapport[section.key] && (
                <section key={section.key} className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">{section.title}</h2>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {report.rapport[section.key]}
                  </p>
                </section>
              )
            ))}
          </div>

          {/* Signature */}
          <div className="mt-12 pt-8 border-t border-gray-300">
            <div className="text-right">
              <p className="font-semibold">{report.signature.medecin}</p>
              <p className="text-sm text-gray-600">{report.signature.qualification}</p>
              {report.signature.rpps && (
                <p className="text-sm text-gray-600">RPPS : {report.signature.rpps}</p>
              )}
              <p className="text-sm text-gray-600">{report.signature.etablissement}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Composant pour l'ordonnance médicamenteuse
  const MedicationPrescription = () => {
    const medications = report.prescriptions?.medicaments?.items || []
    
    if (medications.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-10">
            <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucune prescription médicamenteuse</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <div id="prescription-medicaments" className="bg-white p-8 rounded-lg shadow print:shadow-none">
        <div className="border-b-2 border-blue-600 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">ORDONNANCE MÉDICAMENTEUSE</h2>
              <p className="text-gray-600 mt-1">
                Date : {new Date().toLocaleDateString('fr-FR')}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {medications.length} médicament{medications.length > 1 ? 's' : ''} prescrit{medications.length > 1 ? 's' : ''}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportSectionToPDF('prescription-medicaments', `ordonnance_medicaments_${patientData.lastName || patientData.nom}.pdf`)}
              className="print:hidden"
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        {/* Commenté car l'API check-drug-interactions n'existe pas
        {checkingInteractions && (
          <div className="mb-4 text-center text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            Vérification des interactions médicamenteuses...
          </div>
        )}

        <DrugInteractionsAlert />
        */}

        <div className="space-y-6">
          {medications.map((med: MedicationItem, index: number) => (
            <div key={index} className="border-l-4 border-green-500 pl-4 py-2">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="font-bold text-lg">
                    {index + 1}. {med.nom}
                    {med.nonSubstituable && (
                      <Badge className="ml-2 bg-red-100 text-red-800">Non substituable</Badge>
                    )}
                  </div>
                  {med.dci && (
                    <p className="text-sm text-gray-600">DCI : {med.dci}</p>
                  )}
                  <p className="mt-1">
                    <span className="font-medium">Forme :</span> {med.forme} - {med.dosage}
                  </p>
                  <p className="mt-1">
                    <span className="font-medium">Posologie :</span> {med.posologie}
                  </p>
                  <p className="mt-1">
                    <span className="font-medium">Durée :</span> {med.duree}
                  </p>
                  {med.quantite && (
                    <p className="mt-1">
                      <span className="font-medium">Quantité :</span> {med.quantite}
                    </p>
                  )}
                  {med.remarques && (
                    <p className="mt-2 text-sm text-gray-600 italic">
                      ℹ️ {med.remarques}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {report.prescriptions.medicaments.renouvellement && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm font-medium">
              ✓ Ordonnance renouvelable jusqu'au {report.prescriptions.medicaments.dateValidite}
            </p>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-gray-300">
          <div className="text-right">
            <p className="font-semibold">{report.signature.medecin}</p>
            <p className="text-sm text-gray-600">{report.signature.qualification}</p>
            {report.signature.rpps && (
              <p className="text-sm text-gray-600">RPPS : {report.signature.rpps}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Composant pour les examens biologiques
  const BiologyPrescription = () => {
    const exams = report.prescriptions?.biologie?.examens || []
    
    console.log("🔬 Rendu BiologyPrescription, examens:", exams)
    
    if (exams.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-10">
            <TestTube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun examen biologique prescrit</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <div id="prescription-biologie" className="bg-white p-8 rounded-lg shadow print:shadow-none">
        <div className="border-b-2 border-purple-600 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">ORDONNANCE - EXAMENS BIOLOGIQUES</h2>
              <p className="text-gray-600 mt-1">
                Date : {new Date().toLocaleDateString('fr-FR')}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {exams.length} examen{exams.length > 1 ? 's' : ''} prescrit{exams.length > 1 ? 's' : ''}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportSectionToPDF('prescription-biologie', `ordonnance_biologie_${patientData.lastName || patientData.nom}.pdf`)}
              className="print:hidden"
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {exams.map((exam: BiologyExam, index: number) => (
            <div key={index} className="border-l-4 border-purple-500 pl-4 py-2">
              <div className="font-bold text-lg">
                {index + 1}. {exam.type}
                {exam.code && <span className="text-sm text-gray-600 ml-2">(Code: {exam.code})</span>}
              </div>
              <div className="mt-2 space-y-1">
                {exam.urgence && (
                  <Badge className="bg-red-100 text-red-800">URGENT</Badge>
                )}
                {exam.jeun && (
                  <Badge className="bg-orange-100 text-orange-800 ml-2">À JEUN</Badge>
                )}
                {exam.remarques && (
                  <p className="text-sm text-gray-600 mt-2">
                    ℹ️ {exam.remarques}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm">
            <strong>Laboratoire recommandé :</strong> {report.prescriptions.biologie.laboratoireRecommande}
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-300">
          <div className="text-right">
            <p className="font-semibold">{report.signature.medecin}</p>
            <p className="text-sm text-gray-600">{report.signature.qualification}</p>
            {report.signature.rpps && (
              <p className="text-sm text-gray-600">RPPS : {report.signature.rpps}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Composant pour les examens d'imagerie
  const ImagingPrescription = () => {
    const exams = report.prescriptions?.imagerie?.examens || []
    
    console.log("🏥 Rendu ImagingPrescription, examens:", exams)
    
    if (exams.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-10">
            <Scan className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun examen d'imagerie prescrit</p>
          </CardContent>
        </Card>
      )
    }

    return (
      <div id="prescription-imagerie" className="bg-white p-8 rounded-lg shadow print:shadow-none">
        <div className="border-b-2 border-indigo-600 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">ORDONNANCE - EXAMENS D'IMAGERIE</h2>
              <p className="text-gray-600 mt-1">
                Date : {new Date().toLocaleDateString('fr-FR')}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {exams.length} examen{exams.length > 1 ? 's' : ''} prescrit{exams.length > 1 ? 's' : ''}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportSectionToPDF('prescription-imagerie', `ordonnance_imagerie_${patientData.lastName || patientData.nom}.pdf`)}
              className="print:hidden"
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {exams.map((exam: ImagingExam, index: number) => (
            <div key={index} className="border-l-4 border-indigo-500 pl-4 py-2">
              <div className="font-bold text-lg">
                {index + 1}. {exam.type} - {exam.region}
              </div>
              <div className="mt-2 space-y-1">
                {exam.indication && (
                  <p className="text-sm">
                    <span className="font-medium">Indication :</span> {exam.indication}
                  </p>
                )}
                {exam.urgence && (
                  <Badge className="bg-red-100 text-red-800">URGENT</Badge>
                )}
                {exam.contraste && (
                  <Badge className="bg-yellow-100 text-yellow-800 ml-2">AVEC PRODUIT DE CONTRASTE</Badge>
                )}
                {exam.remarques && (
                  <p className="text-sm text-gray-600 mt-2">
                    ℹ️ {exam.remarques}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded">
          <p className="text-sm">
            <strong>Centre recommandé :</strong> {report.prescriptions.imagerie.centreRecommande}
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-300">
          <div className="text-right">
            <p className="font-semibold">{report.signature.medecin}</p>
            <p className="text-sm text-gray-600">{report.signature.qualification}</p>
            {report.signature.rpps && (
              <p className="text-sm text-gray-600">RPPS : {report.signature.rpps}</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Onglets
  const TabButton = ({ value, label, icon, count }: any) => (
    <button
      onClick={() => setActiveTab(value)}
      className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
        activeTab === value 
          ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
    >
      {icon}
      {label}
      {count > 0 && (
        <Badge variant="secondary" className="ml-1">
          {count}
        </Badge>
      )}
    </button>
  )

  // Rendu principal
  return (
    <div className="space-y-6 print:space-y-4">
      {/* Actions Bar */}
      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Dossier médical généré
              </Badge>
              <span className="text-sm text-gray-600">
                {report.metadata?.wordCount || 0} mots
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimer tout
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Partager
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation par onglets */}
      <div className="print:hidden">
        <div className="flex gap-2 border-b">
          <TabButton 
            value="consultation" 
            label="Compte rendu" 
            icon={<FileText className="h-4 w-4" />} 
            count={0} 
          />
          <TabButton 
            value="medicaments" 
            label="Médicaments" 
            icon={<Pill className="h-4 w-4" />} 
            count={report.prescriptions?.medicaments?.items?.length || 0} 
          />
          <TabButton 
            value="biologie" 
            label="Biologie" 
            icon={<TestTube className="h-4 w-4" />} 
            count={report.prescriptions?.biologie?.examens?.length || 0} 
          />
          <TabButton 
            value="imagerie" 
            label="Imagerie" 
            icon={<Scan className="h-4 w-4" />} 
            count={report.prescriptions?.imagerie?.examens?.length || 0} 
          />
        </div>

        {/* Contenu des onglets */}
        <div className="mt-6">
          {activeTab === "consultation" && <ConsultationReport />}
          {activeTab === "medicaments" && <MedicationPrescription />}
          {activeTab === "biologie" && <BiologyPrescription />}
          {activeTab === "imagerie" && <ImagingPrescription />}
        </div>
      </div>

      {/* Version d'impression complète - toutes les sections */}
      <div className="hidden print:block">
        <ConsultationReport />
        <div className="page-break-before mt-8">
          <MedicationPrescription />
        </div>
        <div className="page-break-before mt-8">
          <BiologyPrescription />
        </div>
        <div className="page-break-before mt-8">
          <ImagingPrescription />
        </div>
      </div>

      {/* Bouton de finalisation */}
      <div className="flex justify-center print:hidden mt-8">
        <Button 
          size="lg"
          onClick={onComplete}
          className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
          disabled={!report}
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          Finaliser et Archiver la Consultation
        </Button>
      </div>

      {/* Debug info pour vérification */}
      <div className="text-xs text-gray-500 mt-4 print:hidden">
        <details>
          <summary>Debug Info (cliquer pour voir)</summary>
          <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
            {JSON.stringify({
              hasReport: !!report,
              hasPrescriptions: !!report?.prescriptions,
              medicationsCount: report?.prescriptions?.medicaments?.items?.length || 0,
              biologyCount: report?.prescriptions?.biologie?.examens?.length || 0,
              imagingCount: report?.prescriptions?.imagerie?.examens?.length || 0,
              reportSections: report?.rapport ? Object.keys(report.rapport) : [],
              reportLength: report?.rapport ? JSON.stringify(report.rapport).length : 0
            }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  )
}
