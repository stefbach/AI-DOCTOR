"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileSignature, Loader2, Download, Printer, CheckCircle, Activity } from "lucide-react"
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    generateReport()
  }, [])

  const generateReport = async () => {
    setLoading(true)
    setError("")
    
    try {
      const response = await fetch("/api/chronic-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          patientData, 
          clinicalData, 
          questionsData, 
          diagnosisData,
          doctorData: {} // Will be populated from session if available
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to generate report: ${response.statusText}`)
      }

      const data = await response.json()
      
      if (data.success && data.report) {
        setReport(data.report)
        toast({
          title: "✅ Report Generated",
          description: "Chronic disease follow-up report is ready"
        })
      } else {
        throw new Error(data.error || "Failed to generate report")
      }
    } catch (err: any) {
      console.error("Error generating report:", err)
      setError(err.message)
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    toast({
      title: "Download",
      description: "Download functionality will be implemented",
    })
  }

  if (loading) {
    return (
      <Card className="border-purple-200">
        <CardContent className="p-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-lg text-gray-600">Generating comprehensive chronic disease report...</p>
          <p className="text-sm text-gray-500 mt-2">This may take up to 1 minute</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="p-6">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <div className="flex gap-4">
            <Button onClick={onBack} variant="outline">Back</Button>
            <Button onClick={generateReport}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!report) return null

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <Card className="border-purple-200 print:hidden">
        <CardContent className="p-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
            <Badge className="bg-green-500">
              <CheckCircle className="h-4 w-4 mr-1" />
              Report Generated
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Report Header */}
      <Card className="border-purple-200">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-6 w-6" />
            {report.header?.documentType || "CHRONIC DISEASE FOLLOW-UP REPORT"}
          </CardTitle>
          <div className="text-sm opacity-90 mt-2">
            Document ID: {report.header?.documentId}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Patient:</Label>
              <p className="font-semibold">{report.patientInfo?.name}</p>
            </div>
            <div>
              <Label>Age / Gender:</Label>
              <p className="font-semibold">{report.patientInfo?.age} / {report.patientInfo?.gender}</p>
            </div>
          </div>
          <div className="mt-4">
            <Label>Chronic Diseases:</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {report.patientInfo?.chronicDiseases?.map((disease: string, idx: number) => (
                <Badge key={idx} variant="secondary">{disease}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vital Signs */}
      {report.vitalSigns && (
        <Card>
          <CardHeader>
            <CardTitle>Vital Signs & Measurements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Blood Pressure:</Label>
                <p className="font-semibold">{report.vitalSigns.bloodPressure}</p>
              </div>
              <div>
                <Label>Blood Glucose:</Label>
                <p className="font-semibold">{report.vitalSigns.bloodGlucose}</p>
              </div>
              <div>
                <Label>BMI:</Label>
                <p className="font-semibold">{report.vitalSigns.bmi}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chronic Disease Status */}
      {report.chronicDiseaseStatus && (
        <Card>
          <CardHeader>
            <CardTitle>Chronic Disease Control Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.chronicDiseaseStatus.diabetes?.status === "present" && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-900">Diabetes</h4>
                <Badge className="mt-1">{report.chronicDiseaseStatus.diabetes.control}</Badge>
                <p className="text-sm mt-2">{report.chronicDiseaseStatus.diabetes.management}</p>
              </div>
            )}
            {report.chronicDiseaseStatus.hypertension?.status === "present" && (
              <div className="p-4 bg-red-50 rounded-lg">
                <h4 className="font-semibold text-red-900">Hypertension</h4>
                <Badge className="mt-1">{report.chronicDiseaseStatus.hypertension.control}</Badge>
                <p className="text-sm mt-2">{report.chronicDiseaseStatus.hypertension.management}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assessment */}
      {report.assessment && (
        <Card>
          <CardHeader>
            <CardTitle>Clinical Assessment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.assessment.chiefComplaint && (
              <div>
                <Label>Chief Complaint:</Label>
                <p className="text-sm">{report.assessment.chiefComplaint}</p>
              </div>
            )}
            {report.assessment.chronicDiseaseReview && (
              <div>
                <Label>Chronic Disease Review:</Label>
                <p className="text-sm whitespace-pre-wrap">{report.assessment.chronicDiseaseReview}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Management Plan */}
      {report.managementPlan && (
        <Card>
          <CardHeader>
            <CardTitle>Management Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {report.managementPlan.medications?.current?.length > 0 && (
              <div>
                <Label>Medications:</Label>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {report.managementPlan.medications.current.map((med: any, idx: number) => (
                    <li key={idx} className="text-sm">
                      <strong>{med.medication}</strong> - {med.dosage} {med.frequency}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {report.managementPlan.lifestyle && (
              <div>
                <Label>Lifestyle Recommendations:</Label>
                <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                  {report.managementPlan.lifestyle.diet && <li>Diet: {report.managementPlan.lifestyle.diet}</li>}
                  {report.managementPlan.lifestyle.exercise && <li>Exercise: {report.managementPlan.lifestyle.exercise}</li>}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Follow-Up */}
      {report.followUp && (
        <Card>
          <CardHeader>
            <CardTitle>Follow-Up Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div>
                <Label>Next Visit:</Label>
                <p className="text-sm">{report.followUp.nextVisit?.timing}</p>
              </div>
              {report.followUp.warningS?.length > 0 && (
                <div>
                  <Label>Warning Signs:</Label>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-sm text-red-600">
                    {report.followUp.warningSigns.map((sign: string, idx: number) => (
                      <li key={idx}>{sign}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-4 print:hidden">
        <Button onClick={onBack} variant="outline" size="lg">
          Back to Edit
        </Button>
        <Button 
          onClick={onComplete} 
          size="lg"
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="h-5 w-5 mr-2" />
          Complete & Return to Home
        </Button>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-gray-700 mb-1">{children}</label>
}
