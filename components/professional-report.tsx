// components/professional-report.tsx

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
  Eye,
  Share2,
  Calendar,
  User,
  Stethoscope,
  FileSignature
} from "lucide-react"

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

  useEffect(() => {
  if (typeof window === 'undefined') return;
  generateProfessionalReport();
}, []);

  const generateProfessionalReport = async () => {
  setLoading(true)
  setError(null)

  try {
    const response = await fetch("/api/generate-professional-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientData,
        clinicalData,
        questionsData,
        diagnosisData,
        editedDocuments
      })
    })

    // Vérifiez le code de statut et le type de contenu.
    // Si ce n’est pas du JSON ou que la requête a échoué, récupérez le corps brut.
    const contentType = response.headers.get("content-type") ?? ""
    if (!response.ok || !contentType.includes("application/json")) {
      const text = await response.text()
      throw new Error(text || `Erreur HTTP ${response.status}`)
    }

    // Si la réponse est OK et au format JSON, on peut la parser sans risque.
    const data = await response.json()

    if (data.success) {
      setReport(data.report)
      // si nécessaire : onComplete?.(data.report)
    } else {
      throw new Error(data.error)
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : "Erreur inconnue")
  } finally {
    setLoading(false)
  }
}


      const data = await response.json()

      if (data.success) {
        setReport(data.report)
      } else {
        throw new Error(data.error)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    // Implémenter la génération PDF avec une librairie comme jsPDF
    console.log("Téléchargement PDF...")
  }

  const handleShare = () => {
    // Partage sécurisé du rapport
    console.log("Partage du rapport...")
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="text-lg font-semibold">Génération du compte rendu professionnel...</p>
            <p className="text-sm text-gray-600">Mise en forme narrative en cours</p>
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

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Actions Bar - Hidden in print */}
      <Card className="print:hidden">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Compte rendu finalisé
              </Badge>
              <span className="text-sm text-gray-600">
                {report.metadata?.wordCount || 0} mots
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimer
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Partager
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Report - Professional Medical Format */}
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

      {/* Prescriptions Annexes - Page Break for Print */}
      <div className="print:break-before-page">
        {report.prescriptionsFormatees && (
          <>
            {/* Prescription Examens */}
            <Card className="shadow-lg print:shadow-none mb-6">
              <CardHeader className="bg-blue-50 print:bg-white">
                <CardTitle>ORDONNANCE - EXAMENS COMPLÉMENTAIRES</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {report.prescriptionsFormatees.examens}
                </pre>
              </CardContent>
            </Card>

            {/* Prescription Médicaments */}
            <Card className="shadow-lg print:shadow-none">
              <CardHeader className="bg-green-50 print:bg-white">
                <CardTitle>ORDONNANCE MÉDICAMENTEUSE</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <pre className="whitespace-pre-wrap font-mono text-sm">
                  {report.prescriptionsFormatees.medicaments}
                </pre>
              </CardContent>
            </Card>
          </>
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
