'use client'

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar,
  FileText,
  Stethoscope,
  Pill,
  TestTube,
  Heart,
  Download,
  Salad,
  CalendarCheck,
  Scan,
  Image as ImageIcon
} from 'lucide-react'
import { ConsultationHistoryItem } from '@/lib/follow-up/shared/utils/history-fetcher'
import { format } from 'date-fns'

export interface ConsultationDetailModalProps {
  consultation: ConsultationHistoryItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * ConsultationDetailModal Component
 *
 * Displays complete details of a previous consultation in a modal dialog.
 * Organized in tabs: Overview, Report, Prescription, Lab Tests, Imaging
 * For chronic disease: includes Diet Plan and Follow-up tabs
 */
export function ConsultationDetailModal({
  consultation,
  open,
  onOpenChange
}: ConsultationDetailModalProps) {
  const [activeTab, setActiveTab] = useState('report')

  if (!consultation) return null

  const consultationType = consultation.consultationType || 'normal'
  const typeConfig = getConsultationTypeConfig(consultationType)
  const isChronic = consultationType === 'chronic' || consultationType === 'chronic_disease'

  // Extract data from fullReport
  const fullReport = consultation.fullReport || {}
  const prescription = extractPrescription(fullReport, consultation.medications)
  const labTests = extractLabTests(fullReport, consultation.labTests)
  const imaging = extractImaging(fullReport, consultation.imagingStudies)
  const dietPlan = extractDietPlan(fullReport, consultation.dietaryPlan)
  const followUp = extractFollowUp(fullReport)

  // Calculate scroll container height: 85vh - header (~80px) - tabs (~50px) - padding
  const scrollContainerStyle = {
    maxHeight: 'calc(85vh - 180px)',
    overflowY: 'auto' as const
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2">
            {typeConfig.icon}
            {typeConfig.label}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {format(new Date(consultation.date), 'MMMM dd, yyyy - HH:mm')}
            <Badge variant="outline" className="ml-2">
              ID: {consultation.consultationId}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full ${isChronic ? 'grid-cols-6' : 'grid-cols-4'}`}>
              <TabsTrigger value="report" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Report</span>
              </TabsTrigger>
              <TabsTrigger value="prescription" className="flex items-center gap-1">
                <Pill className="h-4 w-4" />
                <span className="hidden sm:inline">Prescription</span>
              </TabsTrigger>
              <TabsTrigger value="labs" className="flex items-center gap-1">
                <TestTube className="h-4 w-4" />
                <span className="hidden sm:inline">Labs</span>
              </TabsTrigger>
              <TabsTrigger value="imaging" className="flex items-center gap-1">
                <Scan className="h-4 w-4" />
                <span className="hidden sm:inline">Imaging</span>
              </TabsTrigger>
              {isChronic && (
                <>
                  <TabsTrigger value="diet" className="flex items-center gap-1">
                    <Salad className="h-4 w-4" />
                    <span className="hidden sm:inline">Diet</span>
                  </TabsTrigger>
                  <TabsTrigger value="followup" className="flex items-center gap-1">
                    <CalendarCheck className="h-4 w-4" />
                    <span className="hidden sm:inline">Follow-up</span>
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            {/* REPORT TAB */}
            <TabsContent value="report" className="mt-4">
              <div style={scrollContainerStyle} className="pr-2">
                <ReportTab consultation={consultation} fullReport={fullReport} />
              </div>
            </TabsContent>

            {/* PRESCRIPTION TAB */}
            <TabsContent value="prescription" className="mt-4">
              <div style={scrollContainerStyle} className="pr-2">
                <PrescriptionTab prescription={prescription} consultation={consultation} />
              </div>
            </TabsContent>

            {/* LAB TESTS TAB */}
            <TabsContent value="labs" className="mt-4">
              <div style={scrollContainerStyle} className="pr-2">
                <LabTestsTab labTests={labTests} fullReport={fullReport} />
              </div>
            </TabsContent>

            {/* IMAGING TAB */}
            <TabsContent value="imaging" className="mt-4">
              <div style={scrollContainerStyle} className="pr-2">
                <ImagingTab imaging={imaging} fullReport={fullReport} />
              </div>
            </TabsContent>

            {/* DIET PLAN TAB (Chronic only) */}
            {isChronic && (
              <TabsContent value="diet" className="mt-4">
                <div style={scrollContainerStyle} className="pr-2">
                  <DietPlanTab dietPlan={dietPlan} fullReport={fullReport} />
                </div>
              </TabsContent>
            )}

            {/* FOLLOW-UP TAB (Chronic only) */}
            {isChronic && (
              <TabsContent value="followup" className="mt-4">
                <div style={scrollContainerStyle} className="pr-2">
                  <FollowUpTab followUp={followUp} fullReport={fullReport} />
                </div>
              </TabsContent>
            )}
          </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// ============ HELPER FUNCTIONS ============

// Build a narrative string from the French rapport structure
function buildNarrativeFromRapport(rapport: any): string | null {
  if (!rapport || typeof rapport !== 'object') return null

  const sections: string[] = []

  if (rapport.motifConsultation) {
    sections.push(`**CHIEF COMPLAINT**\n${rapport.motifConsultation}`)
  }

  if (rapport.anamnese || rapport.histoireMaladie) {
    sections.push(`**HISTORY OF PRESENT ILLNESS**\n${rapport.anamnese || rapport.histoireMaladie}`)
  }

  if (rapport.antecedents) {
    sections.push(`**MEDICAL HISTORY**\n${rapport.antecedents}`)
  }

  if (rapport.examenClinique) {
    sections.push(`**PHYSICAL EXAMINATION**\n${rapport.examenClinique}`)
  }

  if (rapport.syntheseDiagnostique || rapport.conclusionDiagnostique) {
    sections.push(`**DIAGNOSIS**\n${rapport.syntheseDiagnostique || rapport.conclusionDiagnostique}`)
  }

  if (rapport.priseEnCharge || rapport.planTraitement) {
    sections.push(`**MANAGEMENT PLAN**\n${rapport.priseEnCharge || rapport.planTraitement}`)
  }

  if (rapport.surveillance) {
    sections.push(`**FOLLOW-UP**\n${rapport.surveillance}`)
  }

  if (rapport.conclusion) {
    sections.push(`**CONCLUSION**\n${rapport.conclusion}`)
  }

  return sections.length > 0 ? sections.join('\n\n') : null
}

// ============ TAB COMPONENTS ============

function ReportTab({ consultation, fullReport }: { consultation: ConsultationHistoryItem, fullReport: any }) {
  // Try multiple data paths for the report content
  // Debug: log fullReport structure
  console.log('📋 ReportTab - fullReport keys:', fullReport ? Object.keys(fullReport) : 'null')
  console.log('📋 consultation_report keys:', fullReport?.consultation_report ? Object.keys(fullReport.consultation_report) : 'none')

  // The data structure uses underscore keys (consultation_report, not consultationReport)
  // - fullReport.consultation_report.content = report content
  // - fullReport.consultation_report.content.rapport = French structure
  // - fullReport.compteRendu = legacy format

  // Path 1: New document format with underscore key (consultation_report)
  const consultationReportObj = fullReport?.consultation_report || {}
  const consultationReportContent = consultationReportObj?.content || {}
  console.log('📋 consultation_report.content keys:', consultationReportContent ? Object.keys(consultationReportContent) : 'none')

  // Path 2: Legacy camelCase format (consultationReport) - fallback
  const legacyConsultationReport = fullReport?.consultationReport || {}
  const legacyContent = legacyConsultationReport?.content || {}

  // Merge both formats
  const reportContent = Object.keys(consultationReportContent).length > 0 ? consultationReportContent : legacyContent

  // Path 3: Legacy Mauritian format (compteRendu at root)
  const compteRendu = fullReport?.compteRendu || reportContent || {}
  const rapport = compteRendu?.rapport || reportContent?.rapport || {}
  console.log('📋 rapport keys:', rapport ? Object.keys(rapport) : 'none')

  // Path 4: Medical report format for chronic disease
  const medicalReport = consultationReportObj?.medicalReport || legacyConsultationReport?.medicalReport || fullReport?.medicalReport || {}
  const clinicalEvalMR = medicalReport?.clinicalEvaluation || {}
  const diagSummaryMR = medicalReport?.diagnosticSummary || {}

  // Path 5: From report content structured fields
  const clinicalEval = reportContent?.clinicalEvaluation || {}
  const diagSummary = reportContent?.diagnosticSummary || {}

  // Try to find narrative from multiple sources - check ALL possible paths
  const narrative =
    // In consultation_report.content
    reportContent?.narrative ||
    consultationReportObj?.narrative ||
    // In content.report (nested)
    reportContent?.report ||
    // Direct on compteRendu
    compteRendu?.narrative ||
    // From rapport synthese (French format - this builds the report content)
    (Object.keys(rapport).length > 0 && rapport?.syntheseDiagnostique ? buildNarrativeFromRapport(rapport) : null) ||
    // Direct on fullReport
    fullReport?.narrative ||
    fullReport?.report?.narrative ||
    fullReport?.content?.narrative ||
    // In medical_report document (underscore)
    fullReport?.medical_report?.narrative ||
    fullReport?.medical_report?.content?.narrative ||
    // From medicalReport (chronic disease)
    medicalReport?.narrative ||
    // If there's a direct report string
    (typeof reportContent === 'string' ? reportContent : null) ||
    (typeof fullReport?.report === 'string' ? fullReport.report : null) ||
    // Also check if fullReport is itself a string/narrative
    (typeof fullReport === 'string' ? fullReport : null)

  // Determine which content to display
  const hasNarrative = narrative && typeof narrative === 'string' && narrative.length > 0

  // Build structured content from any available source
  const chiefComplaint =
    rapport?.motifConsultation ||
    reportContent?.chiefComplaint ||
    clinicalEval?.chiefComplaint ||
    clinicalEvalMR?.chiefComplaint ||
    fullReport?.chiefComplaint ||
    consultation.chiefComplaint

  const historyOfIllness =
    rapport?.anamnese ||
    rapport?.histoireMaladie ||
    reportContent?.historyOfPresentIllness ||
    clinicalEval?.historyOfPresentIllness ||
    clinicalEvalMR?.historyOfPresentIllness ||
    fullReport?.historyOfPresentIllness

  const physicalExam =
    rapport?.examenClinique ||
    reportContent?.physicalExamination ||
    clinicalEval?.physicalExamination ||
    clinicalEvalMR?.physicalExamination ||
    fullReport?.physicalExamination

  const diagnosis =
    rapport?.syntheseDiagnostique ||
    rapport?.conclusionDiagnostique ||
    reportContent?.diagnosis ||
    diagSummary?.diagnosticConclusion ||
    diagSummaryMR?.diagnosticConclusion ||
    fullReport?.diagnosis ||
    consultation.diagnosis

  const treatmentPlan =
    rapport?.priseEnCharge ||
    rapport?.planTraitement ||
    reportContent?.treatmentPlan ||
    medicalReport?.treatmentPlan?.medications ||
    fullReport?.treatmentPlan

  const surveillance =
    rapport?.surveillance ||
    reportContent?.surveillance ||
    fullReport?.surveillance

  const conclusion =
    rapport?.conclusion ||
    reportContent?.conclusion ||
    fullReport?.conclusion

  const antecedents =
    rapport?.antecedents ||
    reportContent?.antecedents ||
    fullReport?.antecedents

  // Also check for dermatology-specific fields
  const skinAnalysis = fullReport?.skinAnalysis || fullReport?.dermatologyAnalysis ||
                       reportContent?.skinAnalysis || compteRendu?.skinAnalysis
  const imageAnalysis = fullReport?.imageAnalysis || compteRendu?.imageAnalysis ||
                        reportContent?.imageAnalysis

  const hasStructuredContent = chiefComplaint || historyOfIllness || physicalExam || diagnosis || skinAnalysis || treatmentPlan

  // For compteRendu, we can build a narrative-like display
  const hasCompteRendu = Object.keys(rapport).length > 0 && (rapport?.motifConsultation || rapport?.syntheseDiagnostique)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Medical Report</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDownloadReport(consultation)}
        >
          <Download className="h-4 w-4 mr-1" />
          Download
        </Button>
      </div>

      {hasNarrative ? (
        // Display the full narrative report (like Tibok does)
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap font-sans text-gray-700 text-sm leading-relaxed">
            {narrative}
          </div>
        </div>
      ) : hasStructuredContent ? (
        // Display structured content from any source
        <div className="space-y-6">
          {chiefComplaint && (
            <ReportSection title="CHIEF COMPLAINT" content={chiefComplaint} />
          )}
          {historyOfIllness && (
            <ReportSection title="HISTORY OF PRESENT ILLNESS" content={historyOfIllness} />
          )}
          {antecedents && (
            <ReportSection title="MEDICAL HISTORY" content={antecedents} />
          )}
          {physicalExam && (
            <ReportSection title="PHYSICAL EXAMINATION" content={physicalExam} />
          )}
          {skinAnalysis && (
            <ReportSection title="SKIN ANALYSIS" content={skinAnalysis} />
          )}
          {imageAnalysis && (
            <ReportSection title="IMAGE ANALYSIS" content={imageAnalysis} />
          )}
          {diagnosis && (
            <ReportSection title="DIAGNOSIS" content={diagnosis} />
          )}
          {treatmentPlan && (
            <ReportSection title="MANAGEMENT PLAN" content={treatmentPlan} />
          )}
          {surveillance && (
            <ReportSection title="FOLLOW-UP / SURVEILLANCE" content={surveillance} />
          )}
          {conclusion && (
            <ReportSection title="CONCLUSION" content={conclusion} />
          )}
        </div>
      ) : (
        <Card className="bg-gray-50">
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No report available for this consultation.</p>
            {/* Debug info - can be removed later */}
            <p className="text-xs text-gray-400 mt-2">
              Available keys: {fullReport ? Object.keys(fullReport).join(', ') : 'none'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Simple report section component matching Tibok style
function ReportSection({ title, content }: { title: string, content: any }) {
  // Convert content to displayable string
  const displayContent = formatContentForDisplay(content)

  return (
    <div>
      <h4 className="font-bold text-gray-800 mb-2">{title}</h4>
      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{displayContent}</p>
    </div>
  )
}

// Helper to convert any content (string, object, array) to displayable string
function formatContentForDisplay(content: any): string {
  if (!content) return ''

  // If it's already a string, return it
  if (typeof content === 'string') return content

  // If it's an array, join items
  if (Array.isArray(content)) {
    return content.map(item =>
      typeof item === 'string' ? item : formatContentForDisplay(item)
    ).join('\n')
  }

  // If it's an object, format each key-value pair
  if (typeof content === 'object') {
    const parts: string[] = []
    for (const [key, value] of Object.entries(content)) {
      if (value) {
        const label = formatKeyToLabel(key)
        const formattedValue = typeof value === 'string' ? value : formatContentForDisplay(value)
        parts.push(`${label}: ${formattedValue}`)
      }
    }
    return parts.join('\n\n')
  }

  // Fallback: convert to string
  return String(content)
}

// Convert camelCase key to readable label
function formatKeyToLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

function PrescriptionTab({ prescription, consultation }: { prescription: any[], consultation: ConsultationHistoryItem }) {
  // Get raw prescriptions data from fullReport
  const fullReport = consultation.fullReport || {}
  const prescriptionsData = fullReport?.prescriptions

  // Try to get medications from prescriptions.content.medications or other paths
  let meds = prescription
  if ((!meds || meds.length === 0) && prescriptionsData?.content?.medications) {
    meds = prescriptionsData.content.medications
  }
  if ((!meds || meds.length === 0) && prescriptionsData?.medications) {
    meds = prescriptionsData.medications
  }
  // Also try prescriptions.content.prescription.medications
  if ((!meds || meds.length === 0) && prescriptionsData?.content?.prescription?.medications) {
    meds = prescriptionsData.content.prescription.medications
  }

  if (!meds || meds.length === 0) {
    return (
      <Card className="bg-gray-50">
        <CardContent className="p-8 text-center">
          <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No prescription available for this consultation.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Prescribed Medications:</h3>

      <div className="space-y-6">
        {meds.map((med: any, idx: number) => {
          // Try many possible field names for medication name (including French)
          const name = typeof med === 'string'
            ? med
            : med.nom || med.name || med.medication || med.medicament || med.drugName || med.medicineName || med.product || med.dci || 'Unknown medication'
          const dosage = med.dosage || med.dose || med.strength
          const frequency = med.posologie || med.frequency || med.frequence || med.schedule
          const duration = med.dureeTraitement || med.duration || med.duree || med.days
          const quantity = med.quantite || med.quantity || med.qty
          const instructions = med.instructions || med.note || med.notes || med.directions
          const form = med.forme || med.form
          const route = med.modeAdministration || med.route

          return (
            <div key={idx} className="space-y-1">
              <p className="font-semibold">{idx + 1}. {name}</p>
              {(form || dosage) && (
                <p className="text-gray-700 ml-4">
                  {form && `Form: ${form}`}
                  {form && dosage && ' • '}
                  {dosage && `Dosage: ${dosage}`}
                </p>
              )}
              {frequency && <p className="text-gray-700 ml-4">Frequency: {frequency}</p>}
              {route && <p className="text-gray-700 ml-4">Route: {route}</p>}
              {(duration || quantity) && (
                <p className="text-gray-700 ml-4">
                  {duration && `Duration: ${duration}`}
                  {duration && quantity && ' • '}
                  {quantity && `Quantity: ${quantity}`}
                </p>
              )}
              {instructions && <p className="text-gray-700 ml-4">Instructions: {instructions}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LabTestsTab({ labTests, fullReport }: { labTests: any[], fullReport: any }) {
  const labData = fullReport?.laboratory_requests

  // Try to get tests from laboratory_requests structure (grouped by category)
  const labRequests = labData?.tests || {}

  // Group tests by category if we have categorized data
  const categorizedTests: Record<string, any[]> = {}

  if (typeof labRequests === 'object' && !Array.isArray(labRequests)) {
    // Tests are already categorized (e.g., { hematology: [...], immunology: [...] })
    Object.entries(labRequests).forEach(([category, tests]) => {
      if (Array.isArray(tests) && tests.length > 0) {
        categorizedTests[category.toUpperCase()] = tests
      }
    })
  }

  // If we have flat labTests array, use them
  if (labTests && labTests.length > 0 && Object.keys(categorizedTests).length === 0) {
    categorizedTests['REQUESTED TESTS'] = labTests
  }

  const hasTests = Object.keys(categorizedTests).length > 0

  if (!hasTests) {
    return (
      <Card className="bg-gray-50">
        <CardContent className="p-8 text-center">
          <TestTube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No laboratory tests available for this consultation.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {Object.entries(categorizedTests).map(([category, tests]) => (
        <div key={category}>
          <h4 className="font-bold text-gray-800 mb-2">{category}</h4>
          <div className="space-y-3 ml-2">
            {tests.map((test: any, idx: number) => {
              // Use French field names (nom, urgence, motifClinique)
              const testName = typeof test === 'string' ? test : test.nom || test.name || test.test || test.testName || 'Unknown test'
              const isUrgent = test.urgence || test.urgent || test.isUrgent || test.priority === 'urgent'
              const reason = test.motifClinique || test.reason || test.indication || test.justification
              const fasting = test.aJeun ? 'Yes' : null
              const resultDelay = test.delaiResultat
              const clinicalInfo = test.renseignementsCliniques

              return (
                <div key={idx} className="text-gray-700">
                  <p className="font-medium">
                    • {testName} {isUrgent && <span className="text-red-600 font-medium">[URGENT]</span>}
                  </p>
                  {reason && <p className="text-sm text-gray-600 ml-4">Clinical reason: {reason}</p>}
                  {fasting && <p className="text-sm text-gray-600 ml-4">Fasting required: {fasting}</p>}
                  {resultDelay && <p className="text-sm text-gray-600 ml-4">Expected delay: {resultDelay}</p>}
                  {clinicalInfo && <p className="text-sm text-gray-600 ml-4">Clinical info: {clinicalInfo}</p>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function ImagingTab({ imaging, fullReport }: { imaging: any[], fullReport: any }) {
  const imagingData = fullReport?.imaging_requests

  // Get imaging from imaging_requests structure - check multiple paths
  let imagingRequests = imagingData?.examinations || imagingData?.content?.examinations || imaging || []

  // Also try to get from content directly if it's an array
  if ((!imagingRequests || imagingRequests.length === 0) && Array.isArray(imagingData?.content)) {
    imagingRequests = imagingData.content
  }

  // Try the content.imaging path
  if ((!imagingRequests || imagingRequests.length === 0) && imagingData?.content?.imaging) {
    imagingRequests = imagingData.content.imaging
  }

  if (!imagingRequests || imagingRequests.length === 0) {
    return (
      <Card className="bg-gray-50">
        <CardContent className="p-8 text-center">
          <Scan className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No imaging studies available for this consultation.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Requested Examinations:</h3>

      <div className="space-y-4">
        {imagingRequests.map((exam: any, idx: number) => {
          // Use French field names (nom, motifClinique, regionAnatomique)
          const name = typeof exam === 'string' ? exam : exam.nom || exam.name || exam.examination || exam.type || exam.modality || exam.examen || 'Unknown examination'
          const indication = exam.motifClinique || exam.indication || exam.reason || exam.justification || exam.clinicalIndication || exam.motif
          const bodyPart = exam.regionAnatomique || exam.bodyPart || exam.region || exam.anatomicalRegion || exam.site || exam.localisation
          const notes = exam.notes || exam.note || exam.comment || exam.renseignementsCliniques || exam.commentaires
          const isUrgent = exam.urgence || exam.urgent || exam.priority === 'urgent'
          const preparation = exam.preparation || exam.preparationPatient

          // Build detail string from all available fields if specific fields not found
          let details: string[] = []
          if (typeof exam === 'object' && !name.includes('Unknown')) {
            // Show any additional fields that might contain useful info
            Object.entries(exam).forEach(([key, value]) => {
              if (value && typeof value === 'string' && !['nom', 'name', 'examination', 'type', 'modality', 'examen'].includes(key)) {
                if (!details.some(d => d.includes(String(value)))) {
                  details.push(`${key}: ${value}`)
                }
              }
            })
          }

          return (
            <div key={idx} className="space-y-1">
              <p className="font-semibold">
                {idx + 1}. {name} {isUrgent && <span className="text-red-600 font-medium">[URGENT]</span>}
              </p>
              {bodyPart && <p className="text-gray-700 ml-4">Body Part: {bodyPart}</p>}
              {indication && <p className="text-gray-700 ml-4">Indication: {indication}</p>}
              {preparation && <p className="text-gray-700 ml-4">Preparation: {preparation}</p>}
              {notes && <p className="text-gray-700 ml-4">Notes: {notes}</p>}
              {/* Show any other details found */}
              {details.length > 0 && !indication && !bodyPart && !notes && (
                <div className="text-gray-600 ml-4 text-sm">
                  {details.slice(0, 3).map((detail, i) => (
                    <p key={i}>{detail}</p>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Helper function to format a meal's foods as readable text
function formatMealFoods(foods: any[]): string {
  if (!foods || !Array.isArray(foods)) return ''
  return foods.map(food => {
    if (typeof food === 'string') return `• ${food}`
    const item = food.item || food.name || food.food || ''
    const quantity = food.quantity || food.portion || ''
    const calories = food.calories || food.kcal || ''
    if (quantity && calories) return `• ${item} (${quantity}) - ${calories} kcal`
    if (quantity) return `• ${item} (${quantity})`
    if (calories) return `• ${item} - ${calories} kcal`
    return `• ${item}`
  }).join('\n')
}

// Helper to format a daily meal plan
function formatDayMeals(day: any, dayLabel: string): JSX.Element | null {
  if (!day || typeof day !== 'object') return null

  const meals = ['breakfast', 'midMorningSnack', 'lunch', 'afternoonSnack', 'dinner']
  const mealLabels: Record<string, string> = {
    breakfast: '🌅 Breakfast',
    midMorningSnack: '🍎 Mid-Morning Snack',
    lunch: '☀️ Lunch',
    afternoonSnack: '🥜 Afternoon Snack',
    dinner: '🌙 Dinner'
  }

  const hasMeals = meals.some(meal => day[meal])
  if (!hasMeals) return null

  return (
    <div className="mb-4">
      <h4 className="font-bold text-green-800 mb-2">{dayLabel}</h4>
      <div className="space-y-3 ml-2">
        {meals.map(meal => {
          const mealData = day[meal]
          if (!mealData) return null
          const foods = mealData.foods || mealData
          const totalCal = mealData.totalCalories
          return (
            <div key={meal}>
              <p className="font-medium text-gray-800">{mealLabels[meal]}{totalCal ? ` (${totalCal} kcal total)` : ''}</p>
              <div className="text-sm text-gray-700 ml-2 whitespace-pre-line">
                {Array.isArray(foods) ? formatMealFoods(foods) : String(foods)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DietPlanTab({ dietPlan, fullReport }: { dietPlan: any, fullReport: any }) {
  console.log('🥗 DietPlanTab - dietPlan:', dietPlan ? Object.keys(dietPlan) : 'null')
  console.log('🥗 DietPlanTab - dietPlan data:', JSON.stringify(dietPlan, null, 2)?.substring(0, 1000))

  // Handle nested content - check multiple levels
  let data = dietPlan || {}
  if (data.content && typeof data.content === 'object') {
    data = data.content
  }
  // Check for double-nested content
  if (data.content && typeof data.content === 'object') {
    data = data.content
  }

  const hasDietPlan = data && Object.keys(data).length > 0

  if (!hasDietPlan) {
    return (
      <Card className="bg-gray-50">
        <CardContent className="p-8 text-center">
          <Salad className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No diet plan available for this consultation.</p>
        </CardContent>
      </Card>
    )
  }

  // Extract structured data
  const header = data.header || {}
  const nutritionalGuidelines = data.nutritionalGuidelines || {}
  const nutritionalAssessment = data.nutritionalAssessment || {}
  const mealPlans = data.mealPlans || {}
  const weeklyMealPlan = data.weeklyMealPlan || {}
  const recommendedFoods = data.recommendedFoods || []
  const forbiddenFoods = data.forbiddenFoods || []
  const practicalGuidance = data.practicalGuidance || {}
  const specialInstructions = data.specialInstructions || []
  const followUpSchedule = data.followUpSchedule || ''

  // Check if we have any of the expected fields
  const hasExpectedDietFields = Object.keys(nutritionalGuidelines).length > 0 ||
                                 nutritionalAssessment.currentDiet ||
                                 Object.keys(mealPlans).length > 0 ||
                                 Object.keys(weeklyMealPlan).length > 0 ||
                                 recommendedFoods.length > 0 ||
                                 forbiddenFoods.length > 0 ||
                                 Object.keys(practicalGuidance).length > 0 ||
                                 specialInstructions.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      {header.title && (
        <div className="text-center pb-2">
          <h3 className="text-xl font-bold text-green-800">{header.title}</h3>
          {header.patientName && <p className="text-gray-600">Patient: {header.patientName}</p>}
          {header.date && <p className="text-sm text-gray-500">Date: {header.date}</p>}
        </div>
      )}

      {/* Nutritional Guidelines */}
      {Object.keys(nutritionalGuidelines).length > 0 && (
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-green-800">Nutritional Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {nutritionalGuidelines.caloriesTarget && <p><strong>Daily Calories:</strong> {nutritionalGuidelines.caloriesTarget}</p>}
            {nutritionalGuidelines.hydration && <p><strong>Hydration:</strong> {nutritionalGuidelines.hydration}</p>}
            {nutritionalGuidelines.macronutrients && (
              <p><strong>Macros:</strong> Protein {nutritionalGuidelines.macronutrients.protein}, Carbs {nutritionalGuidelines.macronutrients.carbs}, Fat {nutritionalGuidelines.macronutrients.fat}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Current Assessment */}
      {nutritionalAssessment.currentDiet && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-sm"><strong>Current Status:</strong> {nutritionalAssessment.currentDiet}</p>
            {nutritionalAssessment.culturalConsiderations && (
              <p className="text-sm text-gray-600 mt-1">{nutritionalAssessment.culturalConsiderations}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Daily Meal Plan Summary */}
      {Object.keys(mealPlans).length > 0 && (
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-green-800">Daily Meal Plan</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {mealPlans.breakfast && (
              <div className="mb-3">
                <p className="font-medium">🌅 Breakfast</p>
                <div className="ml-2 text-gray-700">{Array.isArray(mealPlans.breakfast) ? mealPlans.breakfast.map((f: string, i: number) => <p key={i}>• {f}</p>) : mealPlans.breakfast}</div>
              </div>
            )}
            {mealPlans.lunch && (
              <div className="mb-3">
                <p className="font-medium">☀️ Lunch</p>
                <div className="ml-2 text-gray-700">{Array.isArray(mealPlans.lunch) ? mealPlans.lunch.map((f: string, i: number) => <p key={i}>• {f}</p>) : mealPlans.lunch}</div>
              </div>
            )}
            {mealPlans.dinner && (
              <div className="mb-3">
                <p className="font-medium">🌙 Dinner</p>
                <div className="ml-2 text-gray-700">{Array.isArray(mealPlans.dinner) ? mealPlans.dinner.map((f: string, i: number) => <p key={i}>• {f}</p>) : mealPlans.dinner}</div>
              </div>
            )}
            {mealPlans.snacks && (
              <div className="mb-3">
                <p className="font-medium">🍎 Snacks</p>
                <div className="ml-2 text-gray-700">{Array.isArray(mealPlans.snacks) ? mealPlans.snacks.map((f: string, i: number) => <p key={i}>• {f}</p>) : mealPlans.snacks}</div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Weekly Meal Plan */}
      {Object.keys(weeklyMealPlan).length > 0 && (
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-green-800">7-Day Meal Plan</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {['day1', 'day2', 'day3', 'day4', 'day5', 'day6', 'day7'].map((day, idx) =>
              weeklyMealPlan[day] ? formatDayMeals(weeklyMealPlan[day], `Day ${idx + 1}`) : null
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommended Foods */}
      {recommendedFoods.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-green-800">✅ Recommended Foods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {recommendedFoods.map((food: string, idx: number) => (
                <span key={idx} className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">{food}</span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forbidden Foods */}
      {forbiddenFoods.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-800">❌ Foods to Avoid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {forbiddenFoods.map((food: string, idx: number) => (
                <span key={idx} className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">{food}</span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Practical Guidance */}
      {Object.keys(practicalGuidance).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Practical Tips</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            {practicalGuidance.cookingMethods?.recommended && (
              <div>
                <p className="font-medium text-green-700">Recommended cooking methods:</p>
                <p className="ml-2">{practicalGuidance.cookingMethods.recommended.join(', ')}</p>
              </div>
            )}
            {practicalGuidance.cookingMethods?.avoid && (
              <div>
                <p className="font-medium text-red-700">Avoid:</p>
                <p className="ml-2">{practicalGuidance.cookingMethods.avoid.join(', ')}</p>
              </div>
            )}
            {practicalGuidance.mealPrepTips && (
              <div>
                <p className="font-medium">Meal prep tips:</p>
                {practicalGuidance.mealPrepTips.map((tip: string, idx: number) => (
                  <p key={idx} className="ml-2">• {tip}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Special Instructions */}
      {specialInstructions.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-yellow-800">Special Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {specialInstructions.map((instruction: string, idx: number) => (
              <p key={idx}>• {instruction}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Fallback: Display all content if no expected fields found */}
      {!hasExpectedDietFields && Object.keys(data).filter(k => k !== 'header').length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-green-800">Diet Plan Details</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            {Object.keys(data).filter(k => k !== 'header').map((key) => {
              const value = data[key]
              const label = key
                .replace(/([A-Z])/g, ' $1')
                .replace(/_/g, ' ')
                .replace(/^./, s => s.toUpperCase())
                .trim()

              return (
                <div key={key} className="border-b border-gray-100 pb-3 last:border-0">
                  <p className="font-semibold text-green-800 mb-2">{label}</p>
                  <div className="ml-2 text-gray-700">
                    {renderDietValue(value)}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper to render diet values recursively with proper formatting
function renderDietValue(value: any): JSX.Element {
  if (value === null || value === undefined) {
    return <span className="text-gray-400">N/A</span>
  }

  if (typeof value === 'string') {
    return <p className="whitespace-pre-wrap">{value}</p>
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return <p>{String(value)}</p>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-gray-400">None specified</span>
    }
    return (
      <ul className="list-disc list-inside space-y-1">
        {value.map((item, idx) => (
          <li key={idx} className="text-gray-700">
            {typeof item === 'string' ? item : typeof item === 'object' ? renderDietObject(item) : String(item)}
          </li>
        ))}
      </ul>
    )
  }

  if (typeof value === 'object') {
    return renderDietObject(value)
  }

  return <p>{String(value)}</p>
}

// Helper to render nested diet objects
function renderDietObject(obj: any): JSX.Element {
  if (!obj || typeof obj !== 'object') {
    return <span>{String(obj)}</span>
  }

  const entries = Object.entries(obj)
  if (entries.length === 0) {
    return <span className="text-gray-400">Empty</span>
  }

  return (
    <div className="space-y-2 pl-2 border-l-2 border-green-200">
      {entries.map(([key, val]) => {
        const label = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/_/g, ' ')
          .replace(/^./, s => s.toUpperCase())
          .trim()

        return (
          <div key={key}>
            <span className="font-medium text-gray-700">{label}: </span>
            {typeof val === 'string' ? (
              <span>{val}</span>
            ) : typeof val === 'number' || typeof val === 'boolean' ? (
              <span>{String(val)}</span>
            ) : Array.isArray(val) ? (
              <span>{val.map(v => typeof v === 'string' ? v : v.item || v.name || JSON.stringify(v)).join(', ')}</span>
            ) : typeof val === 'object' && val !== null ? (
              <div className="ml-2 mt-1">{renderDietObject(val)}</div>
            ) : (
              <span>{String(val)}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function FollowUpTab({ followUp, fullReport }: { followUp: any, fullReport: any }) {
  console.log('📅 FollowUpTab - followUp:', followUp ? Object.keys(followUp) : 'null')
  console.log('📅 FollowUpTab - followUp data:', JSON.stringify(followUp, null, 2)?.substring(0, 1000))

  // Handle nested content - check multiple levels
  let data = followUp || {}
  if (data.content && typeof data.content === 'object') {
    data = data.content
  }
  // Check for double-nested content
  if (data.content && typeof data.content === 'object') {
    data = data.content
  }

  const hasFollowUp = data && Object.keys(data).length > 0

  if (!hasFollowUp) {
    return (
      <Card className="bg-gray-50">
        <CardContent className="p-8 text-center">
          <CalendarCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No follow-up plan available for this consultation.</p>
        </CardContent>
      </Card>
    )
  }

  // Extract structured data - check multiple possible field names
  const header = data.header || {}
  const schedule = data.schedule || data.followUpSchedule || data.nextAppointment || data.followUp || ''
  const appointments = data.appointments || data.scheduledAppointments || []
  const monitoringParameters = data.monitoringParameters || data.parametersToMonitor || data.monitoring || []
  const selfMonitoring = data.selfMonitoring || data.homeMonitoring || {}
  const warningSymptoms = data.warningSymptoms || data.warningSigns || data.redFlags || data.alertSymptoms || []
  const medications = data.medicationAdjustments || data.medications || data.treatmentAdjustments || []
  const lifestyleGoals = data.lifestyleGoals || data.goals || data.objectives || []
  const nextSteps = data.nextSteps || data.actionItems || data.recommendations || []
  const emergencyContact = data.emergencyContact || data.emergency || ''
  const notes = data.notes || data.additionalNotes || data.clinicalNotes || ''

  // Check if we have any of the expected fields
  const hasExpectedFields = schedule || appointments.length > 0 || monitoringParameters.length > 0 ||
                            Object.keys(selfMonitoring).length > 0 || warningSymptoms.length > 0 ||
                            lifestyleGoals.length > 0 || nextSteps.length > 0 || notes

  // Get all non-header keys for fallback display
  const otherKeys = Object.keys(data).filter(k => k !== 'header')
  const hasOtherContent = otherKeys.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      {header.title && (
        <div className="text-center pb-2">
          <h3 className="text-xl font-bold text-blue-800">{header.title}</h3>
          {header.patientName && <p className="text-gray-600">Patient: {header.patientName}</p>}
          {header.date && <p className="text-sm text-gray-500">Date: {header.date}</p>}
        </div>
      )}

      {/* Schedule */}
      {schedule && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <p className="text-lg"><strong>Next Follow-up:</strong> {typeof schedule === 'string' ? schedule : schedule.nextVisit || schedule.frequency || JSON.stringify(schedule)}</p>
          </CardContent>
        </Card>
      )}

      {/* Appointments */}
      {appointments.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-blue-800">Scheduled Appointments</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {appointments.map((apt: any, idx: number) => (
              <div key={idx} className="mb-2 p-2 bg-gray-50 rounded">
                <p className="font-medium">{apt.type || apt.purpose || `Appointment ${idx + 1}`}</p>
                {apt.date && <p className="text-gray-600">Date: {apt.date}</p>}
                {apt.provider && <p className="text-gray-600">Provider: {apt.provider}</p>}
                {apt.notes && <p className="text-gray-600">{apt.notes}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Monitoring Parameters */}
      {monitoringParameters.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Parameters to Monitor</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {monitoringParameters.map((param: any, idx: number) => (
              <div key={idx} className="mb-2">
                <p className="font-medium">• {typeof param === 'string' ? param : param.parameter || param.name}</p>
                {param.frequency && <p className="ml-4 text-gray-600">Frequency: {param.frequency}</p>}
                {param.target && <p className="ml-4 text-gray-600">Target: {param.target}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Self Monitoring */}
      {Object.keys(selfMonitoring).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Self-Monitoring Guidelines</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {selfMonitoring.bloodPressure && <p>• Blood Pressure: {selfMonitoring.bloodPressure}</p>}
            {selfMonitoring.bloodGlucose && <p>• Blood Glucose: {selfMonitoring.bloodGlucose}</p>}
            {selfMonitoring.weight && <p>• Weight: {selfMonitoring.weight}</p>}
            {selfMonitoring.symptoms && <p>• Symptoms: {selfMonitoring.symptoms}</p>}
          </CardContent>
        </Card>
      )}

      {/* Warning Symptoms */}
      {warningSymptoms.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-red-800">⚠️ Warning Signs - Seek Immediate Care</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {warningSymptoms.map((symptom: string, idx: number) => (
              <p key={idx}>• {symptom}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Lifestyle Goals */}
      {lifestyleGoals.length > 0 && (
        <Card className="border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-green-800">Lifestyle Goals</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {lifestyleGoals.map((goal: string, idx: number) => (
              <p key={idx}>✓ {goal}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {nextSteps.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Next Steps</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {nextSteps.map((step: string, idx: number) => (
              <p key={idx}>{idx + 1}. {step}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {notes && (
        <Card className="border-gray-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Additional Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-line">
            {typeof notes === 'string' ? notes : JSON.stringify(notes, null, 2)}
          </CardContent>
        </Card>
      )}

      {/* Emergency Contact */}
      {emergencyContact && (
        <Card className="border-red-200">
          <CardContent className="p-4">
            <p className="text-sm"><strong>Emergency Contact:</strong> {emergencyContact}</p>
          </CardContent>
        </Card>
      )}

      {/* Fallback: Display all content if no expected fields found but there's other content */}
      {!hasExpectedFields && hasOtherContent && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Follow-up Plan Details</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-4">
            {otherKeys.map((key) => {
              const value = data[key]
              const label = key
                .replace(/([A-Z])/g, ' $1')
                .replace(/_/g, ' ')
                .replace(/^./, s => s.toUpperCase())
                .trim()

              return (
                <div key={key} className="border-b border-gray-100 pb-3 last:border-0">
                  <p className="font-semibold text-blue-800 mb-2">{label}</p>
                  <div className="ml-2 text-gray-700">
                    {renderFollowUpValue(value)}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Helper to render follow-up values recursively with proper formatting
function renderFollowUpValue(value: any, depth: number = 0): JSX.Element {
  if (value === null || value === undefined) {
    return <span className="text-gray-400">N/A</span>
  }

  if (typeof value === 'string') {
    return <p className="whitespace-pre-wrap">{value}</p>
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return <p>{String(value)}</p>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-gray-400">None specified</span>
    }
    return (
      <ul className="list-disc list-inside space-y-1">
        {value.map((item, idx) => (
          <li key={idx} className="text-gray-700">
            {typeof item === 'string' ? item : typeof item === 'object' ? renderFollowUpObject(item) : String(item)}
          </li>
        ))}
      </ul>
    )
  }

  if (typeof value === 'object') {
    return renderFollowUpObject(value)
  }

  return <p>{String(value)}</p>
}

// Helper to render nested objects
function renderFollowUpObject(obj: any): JSX.Element {
  if (!obj || typeof obj !== 'object') {
    return <span>{String(obj)}</span>
  }

  const entries = Object.entries(obj)
  if (entries.length === 0) {
    return <span className="text-gray-400">Empty</span>
  }

  return (
    <div className="space-y-2 pl-2 border-l-2 border-gray-200">
      {entries.map(([key, val]) => {
        const label = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/_/g, ' ')
          .replace(/^./, s => s.toUpperCase())
          .trim()

        return (
          <div key={key}>
            <span className="font-medium text-gray-700">{label}: </span>
            {typeof val === 'string' ? (
              <span>{val}</span>
            ) : typeof val === 'number' || typeof val === 'boolean' ? (
              <span>{String(val)}</span>
            ) : Array.isArray(val) ? (
              <span>{val.join(', ')}</span>
            ) : typeof val === 'object' && val !== null ? (
              <div className="ml-2 mt-1">{renderFollowUpObject(val)}</div>
            ) : (
              <span>{String(val)}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ============ HELPER FUNCTIONS ============

function getConsultationTypeConfig(type: string) {
  switch (type.toLowerCase()) {
    case 'dermatology':
      return {
        label: 'Dermatology Consultation Details',
        icon: <ImageIcon className="h-5 w-5 text-indigo-600" />
      }
    case 'chronic':
    case 'chronic_disease':
      return {
        label: 'Chronic Disease Consultation Details',
        icon: <Heart className="h-5 w-5 text-red-600" />
      }
    default:
      return {
        label: 'Consultation Details',
        icon: <Stethoscope className="h-5 w-5 text-blue-600" />
      }
  }
}

function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim()
}

function extractReportText(fullReport: any): string {
  if (typeof fullReport === 'string') return fullReport
  if (fullReport?.medicalReport?.narrative) return fullReport.medicalReport.narrative
  if (fullReport?.compteRendu?.synthese) return fullReport.compteRendu.synthese
  if (fullReport?.compteRendu?.rapport) {
    const rapport = fullReport.compteRendu.rapport
    const patient = fullReport.compteRendu.patient
    return `Patient: ${patient?.nom || patient?.fullName || 'N/A'}
Date: ${fullReport.compteRendu.header?.date || 'N/A'}

Motif de Consultation: ${rapport?.motifConsultation || 'N/A'}

Examen Clinique: ${rapport?.examenClinique || 'N/A'}

Synthèse Diagnostique: ${rapport?.syntheseDiagnostique || 'N/A'}

Plan de Traitement: ${rapport?.planTraitement || 'See full report for details.'}`
  }
  if (fullReport?.medicalReport) {
    const mr = fullReport.medicalReport
    return `Patient: ${mr.patient?.fullName || mr.patient?.name || 'N/A'}
Date: ${mr.header?.reportDate || 'N/A'}

Chief Complaint: ${mr.clinicalEvaluation?.chiefComplaint || 'N/A'}

Diagnosis: ${mr.diagnosticSummary?.diagnosticConclusion || 'N/A'}

Treatment Plan: See full report for details.`
  }
  return ''
}

function extractPrescription(fullReport: any, medications?: any[]): any[] {
  if (medications && medications.length > 0) return medications

  // Try multiple possible paths for prescription data
  const paths = [
    // New document format - top level medications
    fullReport?.prescriptions?.medications,
    fullReport?.prescriptions?.content?.medications,
    fullReport?.prescriptions?.content?.medicaments,
    // Old formats
    fullReport?.ordonnances?.medicaments?.prescription?.medications,
    fullReport?.ordonnances?.medicaments?.medications,
    fullReport?.medicationPrescription?.prescription?.medications,
    fullReport?.ordonnance?.medications,
    fullReport?.medicalReport?.prescription?.medications,
    fullReport?.prescription?.medications,
    fullReport?.medicalReport?.treatmentPlan?.medications,
    fullReport?.compteRendu?.traitement?.medications
  ]

  for (const path of paths) {
    if (path && Array.isArray(path) && path.length > 0) {
      return path
    }
  }

  return []
}

function extractLabTests(fullReport: any, labTests?: any[]): any[] {
  if (labTests && labTests.length > 0) return labTests

  // Try multiple possible paths for lab tests data
  const paths = [
    // New document format - tests at top level
    fullReport?.laboratory_requests?.tests?.analyses,
    fullReport?.laboratory_requests?.tests?.tests,
    fullReport?.laboratory_requests?.content?.tests,
    fullReport?.laboratory_requests?.content?.analyses,
    // Old formats
    fullReport?.ordonnances?.biologie?.prescription?.analyses,
    fullReport?.ordonnances?.biologie?.analyses,
    fullReport?.laboratoryTests?.prescription?.tests,
    fullReport?.labResults,
    fullReport?.medicalReport?.labTests,
    fullReport?.medicalReport?.recommendedTests,
    fullReport?.compteRendu?.examensComplementaires?.biological
  ]

  for (const path of paths) {
    if (path && Array.isArray(path) && path.length > 0) {
      return path
    }
  }

  // Also check if tests is an object with categories
  const testsObj = fullReport?.laboratory_requests?.tests
  if (testsObj && typeof testsObj === 'object') {
    // Flatten all test categories into a single array
    const allTests: any[] = []
    for (const category of Object.values(testsObj)) {
      if (Array.isArray(category)) {
        allTests.push(...category)
      }
    }
    if (allTests.length > 0) return allTests
  }

  return []
}

function extractImaging(fullReport: any, imagingStudies?: any[]): any[] {
  if (imagingStudies && imagingStudies.length > 0) return imagingStudies

  // Try multiple possible paths for imaging data
  const paths = [
    // New document format - examinations at top level
    fullReport?.imaging_requests?.examinations,
    fullReport?.imaging_requests?.content?.examinations,
    fullReport?.imaging_requests?.content?.exams,
    fullReport?.imaging_requests?.content?.studies,
    // Old formats
    fullReport?.ordonnances?.imagerie?.prescription?.examinations,
    fullReport?.ordonnances?.imagerie?.examinations,
    fullReport?.paraclinicalExams?.prescription?.exams,
    fullReport?.imagingResults,
    fullReport?.medicalReport?.imagingStudies,
    fullReport?.medicalReport?.paraclinicalExaminations,
    fullReport?.compteRendu?.examensComplementaires?.imaging
  ]

  for (const path of paths) {
    if (path && Array.isArray(path) && path.length > 0) {
      return path
    }
  }

  return []
}

function extractDietPlan(fullReport: any, dietaryPlan?: any): any {
  if (dietaryPlan && typeof dietaryPlan === 'object' && Object.keys(dietaryPlan).length > 0) return dietaryPlan

  // Debug: Log available keys
  console.log('🍎 extractDietPlan - fullReport keys:', fullReport ? Object.keys(fullReport) : 'null')

  // Try multiple possible paths for diet plan data (underscore keys first)
  const paths = [
    // Underscore format (from database)
    fullReport?.diet_plan?.content,
    fullReport?.diet_plan,
    fullReport?.diet_plan_data,
    // CamelCase format
    fullReport?.dietaryPlan,
    fullReport?.dietaryProtocol,
    // In consultation_report (underscore)
    fullReport?.consultation_report?.dietaryPlan,
    fullReport?.consultation_report?.content?.dietaryPlan,
    // In consultationReport (camelCase)
    fullReport?.consultationReport?.dietaryPlan,
    fullReport?.consultationReport?.content?.dietaryPlan,
    // Other possible paths
    fullReport?.mealPlan,
    fullReport?.diet,
    fullReport?.medicalReport?.dietaryPlan,
    fullReport?.medicalReport?.nutritionalPlan
  ]

  for (const path of paths) {
    if (path && typeof path === 'object' && Object.keys(path).length > 0) {
      console.log('🍎 Found diet plan:', Object.keys(path))
      return path
    }
    if (path && typeof path === 'string' && path.length > 0) {
      console.log('🍎 Found diet plan as string')
      return { narrative: path }
    }
  }

  console.log('🍎 No diet plan found')
  return {}
}

function extractFollowUp(fullReport: any): any {
  // Debug: Log available keys
  console.log('📅 extractFollowUp - fullReport keys:', fullReport ? Object.keys(fullReport) : 'null')

  // Try multiple possible paths for follow-up data (underscore keys first)
  const paths = [
    // Underscore format (from database) - check content first
    fullReport?.follow_up?.content,
    fullReport?.follow_up,
    fullReport?.follow_up_data?.content,
    fullReport?.follow_up_data,
    // CamelCase format
    fullReport?.followUpPlan?.content,
    fullReport?.followUpPlan,
    fullReport?.followUp?.content,
    fullReport?.followUp,
    // In consultation_report (underscore)
    fullReport?.consultation_report?.follow_up?.content,
    fullReport?.consultation_report?.follow_up,
    fullReport?.consultation_report?.followUpPlan,
    fullReport?.consultation_report?.content?.followUpPlan,
    // In consultationReport (camelCase)
    fullReport?.consultationReport?.followUpPlan,
    fullReport?.consultationReport?.content?.followUpPlan,
    // Other possible paths
    fullReport?.suivi?.content,
    fullReport?.suivi,
    fullReport?.medicalReport?.followUp,
    fullReport?.medicalReport?.followUpPlan
  ]

  for (const path of paths) {
    if (path && typeof path === 'object' && Object.keys(path).length > 0) {
      console.log('📅 Found follow-up:', Object.keys(path))
      // If the found object only has header, check if there's nested content
      if (Object.keys(path).length === 1 && path.header) {
        console.log('📅 Follow-up only has header, checking for nested content...')
        continue // Try next path
      }
      return path
    }
    if (path && typeof path === 'string' && path.length > 0) {
      console.log('📅 Found follow-up as string')
      return { narrative: path }
    }
  }

  // Last resort: if follow_up exists with any structure, return the deepest content
  const followUpRaw = fullReport?.follow_up || fullReport?.followUp || fullReport?.follow_up_data
  if (followUpRaw) {
    console.log('📅 Using raw follow-up object:', Object.keys(followUpRaw))
    // Check for content property recursively
    if (followUpRaw.content && typeof followUpRaw.content === 'object') {
      if (followUpRaw.content.content && typeof followUpRaw.content.content === 'object') {
        console.log('📅 Found double-nested content')
        return followUpRaw.content.content
      }
      return followUpRaw.content
    }
    return followUpRaw
  }

  console.log('📅 No follow-up found')
  return {}
}

function handleDownloadReport(consultation: ConsultationHistoryItem) {
  let reportContent = ''

  if (typeof consultation.fullReport === 'string') {
    reportContent = consultation.fullReport
  } else if (consultation.fullReport?.medicalReport?.narrative) {
    reportContent = consultation.fullReport.medicalReport.narrative
  } else {
    reportContent = JSON.stringify(consultation.fullReport, null, 2)
  }

  const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Medical_Report_${consultation.consultationId}_${format(new Date(consultation.date), 'yyyy-MM-dd')}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
