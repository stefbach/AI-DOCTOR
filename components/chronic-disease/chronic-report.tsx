"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  FileText,
  Loader2, 
  Download, 
  Printer, 
  CheckCircle, 
  Activity,
  Pill,
  TestTube,
  Stethoscope,
  FileSignature,
  AlertCircle,
  Calendar,
  User,
  Heart,
  Eye,
  ArrowRight
} from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface ChronicReportProps {
  patientData: any
  clinicalData: any
  questionsData: any
  diagnosisData: any
  onComplete: () => void
  onBack: () => void
}

export default function ChronicReport({ 
  patientData, 
  clinicalData, 
  questionsData, 
  diagnosisData, 
  onComplete,
  onBack 
}: ChronicReportProps) {
  const [report, setReport] = useState<any>(null)
  const [prescription, setPrescription] = useState<any>(null)
  const [examOrders, setExamOrders] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [loadingStage, setLoadingStage] = useState("report")

  useEffect(() => {
    generateAllDocuments()
  }, [])

  const generateAllDocuments = async () => {
    setLoading(true)
    setError("")
    
    try {
      // Step 1: Generate medical report
      setLoadingStage("report")
      const reportResponse = await fetch("/api/chronic-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          patientData, 
          clinicalData, 
          questionsData, 
          diagnosisData,
          doctorData: {
            fullName: "Dr. TIBOKai DOCTOR",
            medicalCouncilNumber: "MCM-XXXXXXXXX"
          }
        })
      })

      if (!reportResponse.ok) {
        throw new Error(`Failed to generate report: ${reportResponse.statusText}`)
      }

      const reportData = await reportResponse.json()
      
      if (reportData.success && reportData.report) {
        setReport(reportData.report)
      } else {
        throw new Error(reportData.error || "Failed to generate report")
      }

      // Step 2: Generate prescription
      setLoadingStage("prescription")
      const prescriptionResponse = await fetch("/api/chronic-prescription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          patientData, 
          diagnosisData,
          reportData: reportData.report
        })
      })

      if (prescriptionResponse.ok) {
        const prescriptionData = await prescriptionResponse.json()
        if (prescriptionData.success && prescriptionData.prescription) {
          setPrescription(prescriptionData.prescription)
        }
      }

      // Step 3: Generate exam orders
      setLoadingStage("exams")
      const examsResponse = await fetch("/api/chronic-examens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          patientData, 
          diagnosisData,
          reportData: reportData.report
        })
      })

      if (examsResponse.ok) {
        const examsData = await examsResponse.json()
        if (examsData.success && examsData.examOrders) {
          setExamOrders(examsData.examOrders)
        }
      }

      toast({
        title: "✅ Complete Documentation Generated",
        description: "Medical report, prescription, and exam orders are ready",
        duration: 5000
      })

    } catch (err: any) {
      console.error("Error generating documents:", err)
      setError(err.message)
      toast({
        title: "Error",
        description: "Failed to generate complete documentation. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
      setLoadingStage("")
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    toast({
      title: "📥 Download",
      description: "PDF download functionality will be implemented",
    })
  }

  if (loading) {
    return (
      <Card className="border-purple-200">
        <CardContent className="p-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-lg font-semibold text-gray-700">
            {loadingStage === "report" && "📄 Generating comprehensive medical report..."}
            {loadingStage === "prescription" && "💊 Generating medication prescription..."}
            {loadingStage === "exams" && "🔬 Generating exam orders..."}
          </p>
          <p className="text-sm text-gray-500 mt-2">This may take up to 2 minutes</p>
          <div className="mt-4 flex justify-center gap-2">
            <Badge variant={loadingStage === "report" ? "default" : "outline"}>Report</Badge>
            <ArrowRight className="h-4 w-4 mt-1 text-gray-400" />
            <Badge variant={loadingStage === "prescription" ? "default" : "outline"}>Prescription</Badge>
            <ArrowRight className="h-4 w-4 mt-1 text-gray-400" />
            <Badge variant={loadingStage === "exams" ? "default" : "outline"}>Exams</Badge>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-semibold text-red-600">Error generating documentation</p>
              <p className="text-sm text-gray-600 mt-1">{error}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <Button onClick={onBack} variant="outline">Back</Button>
            <Button onClick={generateAllDocuments} className="bg-purple-600 hover:bg-purple-700">
              Retry Generation
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!report) return null

  const narrativeReport = report.narrativeReport
  const structuredData = report.structuredData

  return (
    <div className="space-y-6">
      {/* Action Buttons - Always at top */}
      <Card className="border-purple-200 print:hidden sticky top-0 z-10 bg-white shadow-lg">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print All
              </Button>
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-green-600 text-white">
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete Documentation
              </Badge>
              <Badge variant="outline">{report.documentMetadata?.documentId || "CHR-XXXX"}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Header */}
      <Card className="border-2 border-purple-300 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <FileText className="h-7 w-7" />
            COMPTE RENDU DE CONSULTATION - SUIVI MALADIE CHRONIQUE
          </CardTitle>
          <div className="text-sm opacity-90 mt-2 flex flex-wrap gap-4">
            <span>📋 {report.documentMetadata?.documentId || "CHR-XXXX-XX-XX-XXXXX"}</span>
            <span>📅 {new Date(report.documentMetadata?.generatedAt || Date.now()).toLocaleDateString('fr-FR')}</span>
            <span>🏥 {report.documentMetadata?.documentType || "CHRONIC DISEASE FOLLOW-UP"}</span>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <div className="flex items-start gap-2">
              <User className="h-5 w-5 text-purple-600 mt-0.5" />
              <div>
                <Label>Patient:</Label>
                <p className="font-semibold text-lg">{structuredData?.patient?.fullName || `${patientData.firstName} ${patientData.lastName}`}</p>
              </div>
            </div>
            <div>
              <Label>Âge / Sexe:</Label>
              <p className="font-semibold">{structuredData?.patient?.age || patientData.age} ans / {structuredData?.patient?.gender || patientData.gender}</p>
            </div>
            <div>
              <Label>IMC:</Label>
              <p className="font-semibold">{structuredData?.patient?.bmi || "N/A"} kg/m²</p>
            </div>
          </div>
          <div>
            <Label>Maladies Chroniques:</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {structuredData?.patient?.chronicDiseases?.map((disease: string, idx: number) => (
                <Badge key={idx} variant="outline" className="text-sm">{disease}</Badge>
              )) || <Badge variant="outline">Non spécifiées</Badge>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Narrative Medical Report - FULL TEXT */}
      {narrativeReport?.fullText && (
        <Card className="border-2 border-blue-300">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-6 w-6" />
              Compte Rendu Médical Narratif Complet
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="prose max-w-none">
              <div className="whitespace-pre-wrap text-gray-800 leading-relaxed font-serif text-justify">
                {narrativeReport.fullText}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vital Signs Summary */}
      {structuredData?.vitalSigns && (
        <Card className="border-green-200">
          <CardHeader className="bg-green-50">
            <CardTitle className="flex items-center gap-2 text-green-900">
              <Heart className="h-5 w-5" />
              Signes Vitaux & Paramètres Cliniques
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="bg-white p-3 rounded border">
                <Label className="text-xs text-gray-500">Pression Artérielle:</Label>
                <p className="font-bold text-lg">{structuredData.vitalSigns.bloodPressure?.systolic}/{structuredData.vitalSigns.bloodPressure?.diastolic} mmHg</p>
              </div>
              <div className="bg-white p-3 rounded border">
                <Label className="text-xs text-gray-500">Glycémie:</Label>
                <p className="font-bold text-lg">{structuredData.vitalSigns.bloodGlucose?.value} g/L</p>
              </div>
              <div className="bg-white p-3 rounded border">
                <Label className="text-xs text-gray-500">Fréquence Cardiaque:</Label>
                <p className="font-bold text-lg">{structuredData.vitalSigns.heartRate} bpm</p>
              </div>
              <div className="bg-white p-3 rounded border">
                <Label className="text-xs text-gray-500">IMC:</Label>
                <p className="font-bold text-lg">{structuredData.vitalSigns.bmi} kg/m²</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disease Assessments Summary */}
      {structuredData?.diseaseAssessments && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Diabetes */}
          {structuredData.diseaseAssessments.diabetes?.present && (
            <Card className="border-blue-300">
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-blue-900 text-lg">🩺 Évaluation Diabète</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Type:</span>
                  <Badge variant="outline">{structuredData.diseaseAssessments.diabetes.type}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Contrôle:</span>
                  <Badge className={
                    structuredData.diseaseAssessments.diabetes.controlStatus === "Excellent" ? "bg-green-600" :
                    structuredData.diseaseAssessments.diabetes.controlStatus === "Good" ? "bg-blue-600" :
                    structuredData.diseaseAssessments.diabetes.controlStatus === "Fair" ? "bg-yellow-600" : "bg-red-600"
                  }>{structuredData.diseaseAssessments.diabetes.controlStatus}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">HbA1c actuelle:</span>
                  <span className="font-bold text-red-600">{structuredData.diseaseAssessments.diabetes.currentHbA1c}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">HbA1c cible:</span>
                  <span className="font-bold text-green-600">{structuredData.diseaseAssessments.diabetes.targetHbA1c}</span>
                </div>
                {structuredData.diseaseAssessments.diabetes.summary && (
                  <p className="text-xs text-gray-600 mt-2 pt-2 border-t italic">{structuredData.diseaseAssessments.diabetes.summary}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Hypertension */}
          {structuredData.diseaseAssessments.hypertension?.present && (
            <Card className="border-red-300">
              <CardHeader className="bg-red-50">
                <CardTitle className="text-red-900 text-lg">❤️ Évaluation Hypertension</CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Stade:</span>
                  <Badge variant="outline">{structuredData.diseaseAssessments.hypertension.stage}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Contrôle:</span>
                  <Badge className={
                    structuredData.diseaseAssessments.hypertension.controlStatus === "Excellent" ? "bg-green-600" :
                    structuredData.diseaseAssessments.hypertension.controlStatus === "Good" ? "bg-blue-600" :
                    structuredData.diseaseAssessments.hypertension.controlStatus === "Fair" ? "bg-yellow-600" : "bg-red-600"
                  }>{structuredData.diseaseAssessments.hypertension.controlStatus}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">PA actuelle:</span>
                  <span className="font-bold text-red-600">{structuredData.diseaseAssessments.hypertension.currentBP}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">PA cible:</span>
                  <span className="font-bold text-green-600">{structuredData.diseaseAssessments.hypertension.targetBP}</span>
                </div>
                {structuredData.diseaseAssessments.hypertension.summary && (
                  <p className="text-xs text-gray-600 mt-2 pt-2 border-t italic">{structuredData.diseaseAssessments.hypertension.summary}</p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* PRESCRIPTION SECTION */}
      {prescription && (
        <Card className="border-2 border-pink-300 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-pink-600 to-rose-600 text-white">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Pill className="h-6 w-6" />
              ORDONNANCE MÉDICAMENTEUSE - TRAITEMENT AU LONG COURS
            </CardTitle>
            <div className="text-sm opacity-90 mt-2">
              📋 {prescription.prescriptionHeader?.prescriptionId} | 📅 {prescription.prescriptionHeader?.issueDate}
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {prescription.chronicMedications && prescription.chronicMedications.length > 0 ? (
              <>
                <div className="mb-4">
                  <Label className="text-lg">Médicaments Prescrits: {prescription.chronicMedications.length}</Label>
                  {prescription.medicationSummary && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge className="bg-blue-600">Antidiabétiques: {prescription.medicationSummary.byCategory?.antidiabetics || 0}</Badge>
                      <Badge className="bg-red-600">Antihypertenseurs: {prescription.medicationSummary.byCategory?.antihypertensives || 0}</Badge>
                      <Badge className="bg-yellow-600">Statines: {prescription.medicationSummary.byCategory?.statins || 0}</Badge>
                      <Badge className="bg-green-600">Antiagrégants: {prescription.medicationSummary.byCategory?.antiplatelets || 0}</Badge>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {prescription.chronicMedications.map((med: any, idx: number) => (
                    <Card key={idx} className="border-l-4 border-l-pink-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <Badge className="mb-1">{med.category}</Badge>
                            <h4 className="font-bold text-lg">{med.lineNumber}. {med.dci}</h4>
                            {med.brandName && <p className="text-sm text-gray-600">({med.brandName})</p>}
                          </div>
                          <Badge variant="outline">{med.dosageForm} {med.strength}</Badge>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-3 mt-3">
                          <div className="bg-blue-50 p-3 rounded">
                            <Label className="text-xs text-blue-900">Posologie:</Label>
                            <p className="text-sm font-semibold">{med.posology?.dosage}</p>
                            <p className="text-xs text-gray-600 mt-1">{med.posology?.frequency} - {med.posology?.timing}</p>
                          </div>
                          <div className="bg-green-50 p-3 rounded">
                            <Label className="text-xs text-green-900">Traitement:</Label>
                            <p className="text-sm font-semibold">{med.treatment?.duration}</p>
                            <p className="text-xs text-gray-600 mt-1">{med.treatment?.renewals}</p>
                          </div>
                        </div>

                        {med.indication && (
                          <div className="mt-3 p-3 bg-gray-50 rounded">
                            <Label className="text-xs">Indication:</Label>
                            <p className="text-sm">{med.indication.chronicDisease}</p>
                            <p className="text-xs text-gray-600 mt-1">{med.indication.therapeuticGoal}</p>
                          </div>
                        )}

                        {med.patientInstructions && (
                          <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                            <Label className="text-xs text-yellow-900">Instructions:</Label>
                            <p className="text-xs">{med.patientInstructions.administrationInstructions}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {prescription.pharmacologicalPlan && (
                  <div className="mt-4 p-4 bg-purple-50 rounded border border-purple-200">
                    <Label className="font-semibold text-purple-900">Plan Pharmacologique:</Label>
                    <p className="text-sm mt-2">{prescription.pharmacologicalPlan.therapeuticStrategy}</p>
                    <div className="grid md:grid-cols-2 gap-3 mt-3">
                      <div>
                        <Label className="text-xs text-gray-600">Objectifs Court Terme:</Label>
                        <p className="text-xs">{prescription.pharmacologicalPlan.shortTermGoals}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Objectifs Long Terme:</Label>
                        <p className="text-xs">{prescription.pharmacologicalPlan.longTermGoals}</p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500">Aucun médicament prescrit</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* EXAM ORDERS SECTION */}
      {examOrders && (
        <Card className="border-2 border-teal-300 shadow-xl">
          <CardHeader className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white">
            <CardTitle className="flex items-center gap-2 text-xl">
              <TestTube className="h-6 w-6" />
              ORDONNANCES D'EXAMENS - SURVEILLANCE MALADIES CHRONIQUES
            </CardTitle>
            <div className="text-sm opacity-90 mt-2">
              📋 {examOrders.orderHeader?.orderId} | 📅 {examOrders.orderHeader?.orderDate}
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Laboratory Tests */}
            {examOrders.laboratoryTests && examOrders.laboratoryTests.length > 0 && (
              <div>
                <h3 className="font-bold text-lg text-teal-900 mb-3 flex items-center gap-2">
                  🧪 Examens Biologiques ({examOrders.laboratoryTests.length})
                </h3>
                <div className="space-y-3">
                  {examOrders.laboratoryTests.map((test: any, idx: number) => (
                    <Card key={idx} className="border-l-4 border-l-teal-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <Badge className="mb-1 bg-teal-600">{test.category}</Badge>
                            <h4 className="font-bold">{test.lineNumber}. {test.testName}</h4>
                          </div>
                          <Badge variant="outline">{test.urgency}</Badge>
                        </div>
                        <div className="grid md:grid-cols-3 gap-2 mt-2">
                          <div className="text-sm">
                            <Label className="text-xs text-gray-500">Indication:</Label>
                            <p className="text-xs">{test.clinicalIndication}</p>
                          </div>
                          <div className="text-sm">
                            <Label className="text-xs text-gray-500">Fréquence:</Label>
                            <p className="text-xs font-semibold">{test.timing?.frequency}</p>
                          </div>
                          <div className="text-sm">
                            <Label className="text-xs text-gray-500">À jeun:</Label>
                            <p className="text-xs font-semibold">{test.preparation?.fasting ? "OUI" : "NON"}</p>
                          </div>
                        </div>
                        {test.expectedResults && (
                          <div className="mt-2 p-2 bg-blue-50 rounded">
                            <Label className="text-xs text-blue-900">Cible:</Label>
                            <p className="text-xs">{test.expectedResults.targetForPatient}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Paraclinical Exams */}
            {examOrders.paraclinicalExams && examOrders.paraclinicalExams.length > 0 && (
              <div>
                <h3 className="font-bold text-lg text-indigo-900 mb-3 flex items-center gap-2">
                  🔬 Examens Paracliniques ({examOrders.paraclinicalExams.length})
                </h3>
                <div className="space-y-3">
                  {examOrders.paraclinicalExams.map((exam: any, idx: number) => (
                    <Card key={idx} className="border-l-4 border-l-indigo-500">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <Badge className="mb-1 bg-indigo-600">{exam.category}</Badge>
                            <h4 className="font-bold">{exam.lineNumber}. {exam.examName}</h4>
                            {exam.examType && <p className="text-sm text-gray-600">{exam.examType}</p>}
                          </div>
                          <Badge variant="outline">{exam.urgency}</Badge>
                        </div>
                        <div className="grid md:grid-cols-2 gap-2 mt-2">
                          <div className="text-sm">
                            <Label className="text-xs text-gray-500">Indication:</Label>
                            <p className="text-xs">{exam.clinicalIndication}</p>
                          </div>
                          <div className="text-sm">
                            <Label className="text-xs text-gray-500">Fréquence:</Label>
                            <p className="text-xs font-semibold">{exam.timing?.frequency}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Specialist Referrals */}
            {examOrders.specialistReferrals && examOrders.specialistReferrals.length > 0 && (
              <div>
                <h3 className="font-bold text-lg text-purple-900 mb-3 flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Consultations Spécialisées ({examOrders.specialistReferrals.length})
                </h3>
                <div className="grid md:grid-cols-2 gap-3">
                  {examOrders.specialistReferrals.map((referral: any, idx: number) => (
                    <Card key={idx} className="border-l-4 border-l-purple-500">
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold">{referral.specialty}</h4>
                          <Badge className="bg-purple-600">{referral.urgency}</Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{referral.indication}</p>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Quand:</span>
                          <span className="font-semibold">{referral.timing}</span>
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className="text-gray-500">Fréquence:</span>
                          <span className="font-semibold">{referral.frequency}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Monitoring Timeline */}
            {examOrders.monitoringPlan && (
              <div className="p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200">
                <h3 className="font-bold text-teal-900 mb-3 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Calendrier de Surveillance
                </h3>
                <div className="grid md:grid-cols-3 gap-3">
                  {examOrders.monitoringPlan.immediate?.length > 0 && (
                    <div className="bg-white p-3 rounded">
                      <Label className="text-xs text-red-600 font-semibold">IMMÉDIAT:</Label>
                      <ul className="text-xs mt-1 space-y-1">
                        {examOrders.monitoringPlan.immediate.map((exam: string, i: number) => (
                          <li key={i}>• {exam}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {examOrders.monitoringPlan.threeMonths?.length > 0 && (
                    <div className="bg-white p-3 rounded">
                      <Label className="text-xs text-blue-600 font-semibold">3 MOIS:</Label>
                      <ul className="text-xs mt-1 space-y-1">
                        {examOrders.monitoringPlan.threeMonths.map((exam: string, i: number) => (
                          <li key={i}>• {exam}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {examOrders.monitoringPlan.annual?.length > 0 && (
                    <div className="bg-white p-3 rounded">
                      <Label className="text-xs text-green-600 font-semibold">ANNUEL:</Label>
                      <ul className="text-xs mt-1 space-y-1">
                        {examOrders.monitoringPlan.annual.map((exam: string, i: number) => (
                          <li key={i}>• {exam}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Doctor Signature Section */}
      {structuredData?.doctorInformation && (
        <Card className="border-2 border-gray-300">
          <CardHeader className="bg-gray-50">
            <CardTitle className="flex items-center gap-2">
              <FileSignature className="h-6 w-6" />
              Signature Médicale
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="text-center">
              <p className="font-bold text-lg">{structuredData.doctorInformation.fullName}</p>
              <p className="text-sm text-gray-600">{structuredData.doctorInformation.specialty}</p>
              <p className="text-sm text-gray-600">MCM: {structuredData.doctorInformation.medicalCouncilNumber}</p>
              <p className="text-xs text-gray-500 mt-2">Date: {new Date().toLocaleDateString('fr-FR')}</p>
              <div className="mt-4 h-20 flex items-center justify-center border-t border-gray-300">
                <p className="text-gray-400 italic">Signature électronique</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bottom Action Buttons */}
      <div className="flex justify-between pt-6 border-t-2 print:hidden">
        <Button onClick={onBack} variant="outline" size="lg">
          ← Retour au Diagnostic
        </Button>
        <Button 
          onClick={onComplete} 
          size="lg"
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          Terminer & Retour Accueil
        </Button>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:hidden {
            display: none !important;
          }
          #print-section, #print-section * {
            visibility: visible;
          }
          #print-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}

function Label({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return <label className={`block text-sm font-semibold ${className}`}>{children}</label>
}
