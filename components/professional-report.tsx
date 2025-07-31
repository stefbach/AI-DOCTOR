// components/professional-report.tsx - Version améliorée

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  FileText, 
  Download, 
  Printer, 
  CheckCircle,
  Loader2,
  Eye,
  Share2,
  Calendar,
  User,
  Stethoscope,
  FileSignature,
  Pill,
  TestTube,
  Scan,
  AlertTriangle,
  ExternalLink,
  Clipboard
} from "lucide-react"
import { jsPDF } from "jspdf"
import html2canvas from "html2canvas"

// Types pour les prescriptions
interface MedicationItem {
  nom: string
  dci?: string // Dénomination Commune Internationale
  dosage: string
  forme: string // comprimé, gélule, sirop, etc.
  posologie: string
  duree: string
  quantite?: string
  remarques?: string
  nonSubstituable?: boolean
}

interface BiologyExam {
  type: string
  code?: string // Code de l'acte
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

interface PrescriptionData {
  medicaments?: {
    items: MedicationItem[]
    renouvellement?: boolean
    dateValidite?: string
  }
  biologie?: {
    examens: BiologyExam[]
    laboratoireRecommande?: string
  }
  imagerie?: {
    examens: ImagingExam[]
    centreRecommande?: string
  }
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
  editedDocuments: any
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
      // Appel à une API de vérification des interactions (exemple)
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
          includeFullPrescriptions: true // Nouveau paramètre pour demander les prescriptions complètes
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
        
        // Vérifier les interactions si des médicaments sont prescrits
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

  // Export PDF pour une section spécifique
  const exportSectionToPDF = async (sectionId: string, filename: string) => {
    const element = document.getElementById(sectionId)
    if (!element) return

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
      })

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const imgWidth = 210 // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(filename)
    } catch (error) {
      console.error("Erreur lors de l'export PDF:", error)
    }
  }

  // Export de toutes les ordonnances en un seul PDF
  const exportAllPrescriptionsToPDF = async () => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const sections = [
      { id: 'prescription-medicaments', name: 'Ordonnance médicamenteuse' },
      { id: 'prescription-biologie', name: 'Ordonnance biologie' },
      { id: 'prescription-imagerie', name: 'Ordonnance imagerie' }
    ]

    for (let i = 0; i < sections.length; i++) {
      const element = document.getElementById(sections[i].id)
      if (element) {
        if (i > 0) pdf.addPage()
        
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false
        })

        const imgWidth = 210
        const imgHeight = (canvas.height * imgWidth) / canvas.width
        
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight)
      }
    }

    pdf.save(`ordonnances_${patientData.lastName}_${patientData.firstName}_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleShare = () => {
    console.log("Partage du rapport...")
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

  // Composant pour afficher les interactions médicamenteuses
  const DrugInteractionsAlert = () => {
    if (!drugInteractions.length) return null

    const severeInteractions = drugInteractions.filter(i => i.severity === 'majeure')
    const moderateInteractions = drugInteractions.filter(i => i.severity === 'modérée')

    return (
      <Alert className={`mb-6 ${severeInteractions.length > 0 ? 'border-red-500' : 'border-yellow-500'}`}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
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
        </AlertDescription>
      </Alert>
    )
  }

  // Composant pour l'ordonnance médicamenteuse
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
              Exporter PDF
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

  // Composant pour l'ordonnance biologie
  const BiologyPrescription = () => {
    if (!report.prescriptions?.biologie) return null

    return (
      <div id="prescription-biologie" className="bg-white p-8 rounded-lg shadow print:shadow-none">
        <div className="border-b-2 border-blue-600 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">ORDONNANCE - EXAMENS BIOLOGIQUES</h2>
              <p className="text-gray-600 mt-1">
                Date : {new Date().toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div className="flex gap-2 print:hidden">
              {report.prescriptions.biologie.examens.some((e: BiologyExam) => e.urgence) && (
                <Badge variant="destructive">URGENT</Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportSectionToPDF('prescription-biologie', `ordonnance_biologie_${patientData.lastName}.pdf`)}
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter PDF
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <p className="font-medium mb-3">Examens à réaliser :</p>
          <div className="space-y-3">
            {report.prescriptions.biologie.examens.map((exam: BiologyExam, index: number) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                <div className="mt-1">□</div>
                <div className="flex-1">
                  <div className="font-medium">
                    {exam.type}
                    {exam.code && <span className="text-gray-600 ml-2">(Code: {exam.code})</span>}
                  </div>
                  <div className="flex gap-2 mt-1">
                    {exam.jeun && (
                      <Badge className="bg-orange-100 text-orange-800 text-xs">
                        À jeun (12h)
                      </Badge>
                    )}
                    {exam.urgence && (
                      <Badge variant="destructive" className="text-xs">
                        Urgent
                      </Badge>
                    )}
                  </div>
                  {exam.remarques && (
                    <p className="text-sm text-gray-600 mt-1">{exam.remarques}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4 mt-6 text-sm text-gray-600">
          <p className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Prélèvement à réaliser dans un laboratoire d'analyses médicales agréé
          </p>
          {report.prescriptions.biologie.laboratoireRecommande && (
            <p className="mt-2">
              Laboratoire recommandé : <span className="font-medium">{report.prescriptions.biologie.laboratoireRecommande}</span>
            </p>
          )}
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

  // Composant pour l'ordonnance imagerie
  const ImagingPrescription = () => {
    if (!report.prescriptions?.imagerie) return null

    return (
      <div id="prescription-imagerie" className="bg-white p-8 rounded-lg shadow print:shadow-none">
        <div className="border-b-2 border-blue-600 pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">ORDONNANCE - IMAGERIE MÉDICALE</h2>
              <p className="text-gray-600 mt-1">
                Date : {new Date().toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div className="flex gap-2 print:hidden">
              {report.prescriptions.imagerie.examens.some((e: ImagingExam) => e.urgence) && (
                <Badge variant="destructive">URGENT</Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportSectionToPDF('prescription-imagerie', `ordonnance_imagerie_${patientData.lastName}.pdf`)}
              >
                <Download className="h-4 w-4 mr-2" />
                Exporter PDF
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {report.prescriptions.imagerie.examens.map((exam: ImagingExam, index: number) => (
            <div key={index} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h4 className="font-bold text-lg flex items-center gap-2">
                    <Scan className="h-5 w-5" />
                    {exam.type}
                  </h4>
                  <p className="mt-2">
                    <span className="font-medium">Région anatomique :</span> {exam.region}
                  </p>
                  <p className="mt-1">
                    <span className="font-medium">Indication clinique :</span> {exam.indication}
                  </p>
                  {exam.contraste && (
                    <Alert className="mt-3 border-yellow-200 bg-yellow-50">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        Injection de produit de contraste prévue - Vérifier la fonction rénale
                      </AlertDescription>
                    </Alert>
                  )}
                  {exam.remarques && (
                    <p className="text-sm text-gray-600 mt-2 italic">{exam.remarques}</p>
                  )}
                </div>
                {exam.urgence && (
                  <Badge variant="destructive">URGENT</Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded text-sm">
          <p className="flex items-center gap-2 font-medium">
            <Scan className="h-4 w-4" />
            Instructions pour le patient :
          </p>
          <ul className="mt-2 ml-6 space-y-1 text-gray-700">
            <li>• Prendre rendez-vous dans un centre d'imagerie médicale</li>
            <li>• Apporter cette ordonnance et votre carte vitale</li>
            <li>• Signaler toute allergie ou grossesse</li>
            <li>• Suivre les consignes de préparation spécifiques à l'examen</li>
          </ul>
          {report.prescriptions.imagerie.centreRecommande && (
            <p className="mt-3">
              Centre recommandé : <span className="font-medium">{report.prescriptions.imagerie.centreRecommande}</span>
            </p>
          )}
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

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Actions Bar - Hidden in print */}
      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Dossier médical complet
              </Badge>
              <span className="text-sm text-gray-600">
                {report.metadata?.wordCount || 0} mots
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Tout imprimer
              </Button>
              <Button variant="outline" size="sm" onClick={exportAllPrescriptionsToPDF}>
                <Download className="h-4 w-4 mr-2" />
                Toutes les ordonnances (PDF)
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Partager
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs pour naviguer entre les sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="consultation" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Compte rendu
          </TabsTrigger>
          <TabsTrigger value="medicaments" className="flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Médicaments
            {report.prescriptions?.medicaments && (
              <Badge variant="secondary" className="ml-1">
                {report.prescriptions.medicaments.items.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="biologie" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Biologie
            {report.prescriptions?.biologie && (
              <Badge variant="secondary" className="ml-1">
                {report.prescriptions.biologie.examens.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="imagerie" className="flex items-center gap-2">
            <Scan className="h-4 w-4" />
            Imagerie
            {report.prescriptions?.imagerie && (
              <Badge variant="secondary" className="ml-1">
                {report.prescriptions.imagerie.examens.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consultation" className="mt-6">
          {/* Compte rendu de consultation original */}
          <Card className="shadow-xl print:shadow-none">
            <CardContent className="p-8 print:p-12">
              {/* Header */}
              <div className="text-center mb-8 print:mb-12">
                <h1 className="text-2xl font-bold mb-2">{report.header.title}</h1>
                <p className="text-gray-600">{report.header.subtitle}</p>
                <p className="text-sm text-gray-500 mt-2">Référence : {report.header.reference}</p>
              </div>

              {/* Patient Identification */}
              <div className="bg-gray-50 p-6 rounded-lg mb-8 print:border print:border-gray-300">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-semibold">PATIENT</p>
                    <p className="text-lg">{report.identification.patient}</p>
                    <p className="text-sm text-gray-600">
                      {report.identification.age} - {report.identification.sexe}
                    </p>
                    <p className="text-sm text-gray-600">
                      Né(e) le {report.identification.dateNaissance}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold">COORDONNÉES</p>
                    <p className="text-sm">{report.identification.adresse}</p>
                    <p className="text-sm">Tél : {report.identification.telephone}</p>
                  </div>
                </div>
              </div>

              {/* Medical Report Content */}
              <div className="prose prose-lg max-w-none space-y-6 print:text-black">
                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-3">MOTIF DE CONSULTATION</h2>
                  <p className="text-gray-700 leading-relaxed">{report.rapport.motifConsultation}</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-3">ANAMNÈSE</h2>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {report.rapport.anamnese}
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-3">ANTÉCÉDENTS</h2>
                  <p className="text-gray-700 leading-relaxed">{report.rapport.antecedents}</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-3">EXAMEN CLINIQUE</h2>
                  <p className="text-gray-700 leading-relaxed">{report.rapport.examenClinique}</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-3">SYNTHÈSE DIAGNOSTIQUE</h2>
                  <p className="text-gray-700 leading-relaxed">{report.rapport.syntheseDiagnostique}</p>
                </section>

                <section className="bg-blue-50 p-4 rounded-lg print:border print:border-blue-300">
                  <h2 className="text-xl font-bold text-blue-900 mb-3">CONCLUSION DIAGNOSTIQUE</h2>
                  <p className="text-blue-800 leading-relaxed font-medium">
                    {report.rapport.conclusionDiagnostique}
                  </p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-3">PRISE EN CHARGE</h2>
                  <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {report.rapport.priseEnCharge}
                  </div>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-3">SURVEILLANCE ET SUIVI</h2>
                  <p className="text-gray-700 leading-relaxed">{report.rapport.surveillance}</p>
                </section>

                <section>
                  <h2 className="text-xl font-bold text-gray-900 mb-3">CONCLUSION</h2>
                  <p className="text-gray-700 leading-relaxed">{report.rapport.conclusion}</p>
                </section>
              </div>

              {/* Signature Block */}
              <div className="mt-12 pt-8 border-t border-gray-300">
                <div className="grid grid-cols-2">
                  <div>
                    <p className="text-sm text-gray-600 mb-8">
                      Fait à {report.signature.etablissement}
                    </p>
                    <p className="text-sm text-gray-600">
                      Le {new Date().toLocaleDateString('fr-FR', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="inline-block text-left">
                      <p className="font-semibold">{report.signature.medecin}</p>
                      <p className="text-sm text-gray-600">{report.signature.qualification}</p>
                      {report.signature.rpps && (
                        <p className="text-sm text-gray-600">RPPS : {report.signature.rpps}</p>
                      )}
                      <div className="mt-8 pt-8 border-t border-gray-400 w-48">
                        <p className="text-sm text-gray-600">Signature</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medicaments" className="mt-6">
          <MedicationPrescription />
        </TabsContent>

        <TabsContent value="biologie" className="mt-6">
          <BiologyPrescription />
        </TabsContent>

        <TabsContent value="imagerie" className="mt-6">
          <ImagingPrescription />
        </TabsContent>
      </Tabs>

      {/* Version imprimable - toutes les sections */}
      <div className="hidden print:block">
        {/* Compte rendu */}
        <Card className="shadow-none mb-8">
          <CardContent className="p-12">
            {/* Contenu du compte rendu (même que dans l'onglet) */}
            {/* ... */}
          </CardContent>
        </Card>

        {/* Page break avant les ordonnances */}
        <div className="break-before-page">
          {report.prescriptions?.medicaments && <MedicationPrescription />}
        </div>

        {report.prescriptions?.biologie && (
          <div className="break-before-page mt-8">
            <BiologyPrescription />
          </div>
        )}

        {report.prescriptions?.imagerie && (
          <div className="break-before-page mt-8">
            <ImagingPrescription />
          </div>
        )}
      </div>

      {/* Complete Button */}
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
