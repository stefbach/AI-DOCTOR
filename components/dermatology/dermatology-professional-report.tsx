"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Download, FileText } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Props {
  patientData: any
  imageData: any
  ocrAnalysisData: any
  questionsData: any
  diagnosisData: any
  onComplete: () => void
}

export default function DermatologyProfessionalReport(props: Props) {
  const [report, setReport] = useState(generateReportText(props))

  function generateReportText(data: any) {
    return `DERMATOLOGY CONSULTATION REPORT

Patient: ${data.patientData.firstName} ${data.patientData.lastName}
Age: ${data.patientData.age} | Gender: ${data.patientData.gender}
Date: ${new Date().toLocaleDateString()}

IMAGING ANALYSIS:
${data.ocrAnalysisData?.summary || 'N/A'}

CLINICAL ASSESSMENT:
${data.diagnosisData?.diagnosis?.fullText || 'Pending diagnosis'}

TREATMENT PLAN:
[To be completed by physician]

FOLLOW-UP:
Recommended follow-up in 2-4 weeks

Physician Signature: ________________
Date: ${new Date().toLocaleDateString()}
`
  }

  const handleDownload = () => {
    const blob = new Blob([report], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dermatology-report-${props.patientData.lastName}-${Date.now()}.txt`
    a.click()
    toast({ title: "Downloaded", description: "Report downloaded successfully" })
  }

  return (
    <div className="space-y-6">
      <Card className="border-teal-200">
        <CardHeader className="bg-gradient-to-r from-teal-50 to-cyan-50">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Professional Dermatology Report
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <Textarea value={report} onChange={(e) => setReport(e.target.value)} className="min-h-[500px] font-mono text-sm" />
          
          <div className="flex gap-4">
            <Button onClick={handleDownload} className="bg-gradient-to-r from-teal-600 to-cyan-600">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
            <Button onClick={props.onComplete} variant="outline" className="border-teal-500 text-teal-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Consultation
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-teal-200 bg-teal-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-teal-600" />
            <div>
              <p className="font-semibold text-teal-900">Consultation Complete</p>
              <p className="text-sm text-teal-700">All dermatology workflow steps have been completed successfully.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
