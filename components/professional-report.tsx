// components/professional-report.tsx - Version sans dépendances externes

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
} from "lucide-react"

// Types pour les prescriptions (identiques)
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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    generateProfessionalReport();
  }, []);

  // Vérifier les interactions médicamenteuses
  const checkDrugInteractions = async (medications: MedicationItem[]) => {
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
  }

  const generateProfessionalReport = async () => {
    setLoading(true)
    setError(null)

    try {
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
      if (!response.ok || !contentType.includes("application/json")) {
        const text = await response.text()
        throw new Error(text || `Erreur HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setReport(data.report)
        
        if (data.report.prescriptions?.medicaments?.items?.length > 0) {
          await checkDrugInteractions(data.report.prescriptions.medicaments.items)
        }
        
        if (onComplete && data.report) {
          onComplete()
        }
      } else {
        throw new Error(data.error || "Erreur lors de la génération du rapport")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }

  // Export simplifié - utilise window.print avec CSS spécifique
  const exportSectionToPDF = (sectionId: string, filename: string) => {
    // Créer une fenêtre d'impression avec seulement la section désirée
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
            @media print {
              @page { margin: 20mm; }
              body { font-family: Arial, sans-serif; }
            }
          </style>
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `

    printWindow.document.write(content)
    printWindow.document.close()
    printWindow.print()
  }

  // Export toutes les ordonnances - version simplifiée
  const exportAllPrescriptionsToPDF = () => {
    window.print()
  }

  const handlePrint = () => {
    window.print()
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Compte rendu médical',
        text: `Compte rendu de ${patientData.lastName} ${patientData.firstName}`
      })
    }
  }

  if (loading) {
    return (
      <Card>
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
      <Card className="border-red-200">
        <CardContent className="text-center py-10">
          <p className="text-red-600">Erreur : {error}</p>
          <Button onClick={generateProfessionalReport} className="mt-4">
            Réessayer
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!report) return null

  // Composant Alert simplifié (sans shadcn/ui Alert)
  const DrugInteractionsAlert = () => {
    if (!drugInteractions.length) return null

    const severeInteractions = drugInteractions.filter(i => i.severity === 'majeure')
    const moderateInteractions = drugInteractions.filter(i => i.severity === 'modérée')

    return (
      <div className={`mb-6 p-4 border rounded-lg ${
        severeInteractions.length > 0 ? 'border-red-500 bg-red-50' : 'border-yellow-500 bg-yellow-50'
      }`}>
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-semibold mb-2">
              ⚠️ Interactions médicamenteuses détectées
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

  // Composants d'ordonnance (identiques mais sans export PDF complexe)
  const MedicationPrescription = () => {
    if (!report.prescriptions?.medicaments) return null

    return (
      <div id="prescription-medicaments" className="bg-white p-8 rounded-lg shadow print:shadow-none">
        <div className="border-b-2 border-blue-600 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">ORDONNANCE MÉDICAMENTEUSE</h2>
              <p className="text-gray-600 mt-1">
                Date : {new Date().toLocaleDateString('fr-FR')}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportSectionToPDF('prescription-medicaments', `ordonnance_medicaments_${patientData.lastName}.pdf`)}
              className="print:hidden"
            >
              <Download className="h-4 w-4 mr-2" />
              Exporter
            </Button>
          </div>
        </div>

        {checkingInteractions && (
          <div className="mb-4 text-center text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
            Vérification des interactions médicamenteuses...
          </div>
        )}

        <DrugInteractionsAlert />

        <div className="space-y-6">
          {report.prescriptions.medicaments.items.map((med: MedicationItem, index: number) => (
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

  // Onglets simplifiés sans Tabs de shadcn
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

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Actions Bar */}
      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Dossier médical complet
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimer
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Partager
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation par onglets simplifiée */}
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
          {activeTab === "consultation" && (
            <Card className="shadow-xl print:shadow-none">
              <CardContent className="p-8 print:p-12">
                {/* Compte rendu de consultation (identique) */}
                <div className="text-center mb-8 print:mb-12">
                  <h1 className="text-2xl font-bold mb-2">{report.header.title}</h1>
                  <p className="text-gray-600">{report.header.subtitle}</p>
                  <p className="text-sm text-gray-500 mt-2">Référence : {report.header.reference}</p>
                </div>

                {/* Contenu du rapport médical */}
                <div className="prose prose-lg max-w-none space-y-6 print:text-black">
                  {/* Toutes les sections du rapport (identiques) */}
                  <section>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">MOTIF DE CONSULTATION</h2>
                    <p className="text-gray-700 leading-relaxed">{report.rapport.motifConsultation}</p>
                  </section>
                  {/* ... autres sections ... */}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "medicaments" && <MedicationPrescription />}
          
          {/* Ajoutez BiologyPrescription et ImagingPrescription de la même manière */}
        </div>
      </div>

      {/* Bouton de finalisation */}
      <div className="flex justify-center print:hidden">
        <Button 
          size="lg"
          onClick={onComplete}
          className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          Finaliser et Archiver la Consultation
        </Button>
      </div>
    </div>
  )
}
