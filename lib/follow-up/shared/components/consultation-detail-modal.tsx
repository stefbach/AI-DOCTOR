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
  Activity,
  TestTube,
  Image as ImageIcon,
  Heart,
  Download,
  ClipboardList,
  Salad,
  CalendarCheck,
  Scan
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
  const [activeTab, setActiveTab] = useState('overview')

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0">
        <div className="max-h-[85vh] overflow-y-auto p-6">
        <DialogHeader>
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className={`grid w-full ${isChronic ? 'grid-cols-6' : 'grid-cols-5'}`}>
            <TabsTrigger value="overview" className="flex items-center gap-1">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
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
              <span className="hidden sm:inline">Lab Tests</span>
            </TabsTrigger>
            <TabsTrigger value="imaging" className="flex items-center gap-1">
              <Scan className="h-4 w-4" />
              <span className="hidden sm:inline">Imaging</span>
            </TabsTrigger>
            {isChronic && (
              <TabsTrigger value="diet" className="flex items-center gap-1">
                <Salad className="h-4 w-4" />
                <span className="hidden sm:inline">Diet</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="mt-4">
            <div className="space-y-4">
              {/* Chief Complaint */}
              {consultation.chiefComplaint && (
                <Section
                  icon={<Stethoscope className="h-5 w-5 text-red-500" />}
                  title="Chief Complaint"
                >
                  <p className="text-gray-700 whitespace-pre-wrap">{consultation.chiefComplaint}</p>
                </Section>
              )}

              {/* Diagnosis */}
              {consultation.diagnosis && (
                <Section
                  icon={<FileText className="h-5 w-5 text-blue-500" />}
                  title="Diagnosis"
                >
                  <p className="text-gray-700 whitespace-pre-wrap">{consultation.diagnosis}</p>
                </Section>
              )}

              {/* Vital Signs */}
              {consultation.vitalSigns && Object.keys(consultation.vitalSigns).length > 0 && (
                <Section
                  icon={<Activity className="h-5 w-5 text-green-500" />}
                  title="Vital Signs"
                >
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(consultation.vitalSigns).map(([key, value]) => (
                      <VitalSignItem key={key} label={formatLabel(key)} value={String(value)} />
                    ))}
                  </div>
                </Section>
              )}

              {/* Images (Dermatology) */}
              {consultation.images && consultation.images.length > 0 && (
                <Section
                  icon={<ImageIcon className="h-5 w-5 text-indigo-500" />}
                  title="Clinical Images"
                  badge={consultation.images.length}
                >
                  <div className="grid grid-cols-2 gap-4">
                    {consultation.images.map((imageUrl, idx) => (
                      <div key={idx} className="border rounded-lg overflow-hidden">
                        <img
                          src={imageUrl}
                          alt={`Clinical image ${idx + 1}`}
                          className="w-full h-48 object-cover"
                        />
                        <div className="p-2 bg-gray-50">
                          <p className="text-xs text-gray-600">Image {idx + 1}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {/* Quick Summary */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Quick Summary:</strong> Use the tabs above to view detailed information about the report, prescription, lab tests, and imaging studies.
                    {isChronic && ' Diet plan is also available for this chronic disease consultation.'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* REPORT TAB */}
          <TabsContent value="report" className="mt-4">
            <ReportTab consultation={consultation} fullReport={fullReport} />
          </TabsContent>

          {/* PRESCRIPTION TAB */}
          <TabsContent value="prescription" className="mt-4">
            <PrescriptionTab prescription={prescription} consultation={consultation} />
          </TabsContent>

          {/* LAB TESTS TAB */}
          <TabsContent value="labs" className="mt-4">
            <LabTestsTab labTests={labTests} fullReport={fullReport} />
          </TabsContent>

          {/* IMAGING TAB */}
          <TabsContent value="imaging" className="mt-4">
            <ImagingTab imaging={imaging} fullReport={fullReport} />
          </TabsContent>

          {/* DIET PLAN TAB (Chronic only) */}
          {isChronic && (
            <TabsContent value="diet" className="mt-4">
              <DietPlanTab dietPlan={dietPlan} followUp={followUp} fullReport={fullReport} />
            </TabsContent>
          )}
        </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============ TAB COMPONENTS ============

function ReportTab({ consultation, fullReport }: { consultation: ConsultationHistoryItem, fullReport: any }) {
  // Try multiple data paths for the report content

  // Path 1: New document format (consultation_report.content.narrative)
  const consultationReport = fullReport?.consultation_report
  const reportContent = consultationReport?.content || {}
  const narrative = reportContent?.narrative

  // Path 2: Mauritian format (compteRendu)
  const compteRendu = fullReport?.compteRendu
  const rapport = compteRendu?.rapport || {}

  // Path 3: Medical report format (medicalReport)
  const medicalReport = fullReport?.medicalReport
  const clinicalEvalMR = medicalReport?.clinicalEvaluation || {}
  const diagSummaryMR = medicalReport?.diagnosticSummary || {}

  // Path 4: From consultation_report.content structured fields
  const clinicalEval = reportContent?.clinicalEvaluation || {}
  const diagSummary = reportContent?.diagnosticSummary || {}

  // Determine which content to display
  const hasNarrative = narrative && narrative.length > 0

  // Build structured content from any available source
  const chiefComplaint =
    clinicalEval?.chiefComplaint ||
    rapport?.motifConsultation ||
    clinicalEvalMR?.chiefComplaint ||
    consultation.chiefComplaint

  const historyOfIllness =
    clinicalEval?.historyOfPresentIllness ||
    rapport?.histoireMaladie ||
    clinicalEvalMR?.historyOfPresentIllness

  const physicalExam =
    clinicalEval?.physicalExamination ||
    rapport?.examenClinique ||
    clinicalEvalMR?.physicalExamination

  const diagnosis =
    diagSummary?.diagnosticConclusion ||
    rapport?.syntheseDiagnostique ||
    diagSummaryMR?.diagnosticConclusion ||
    consultation.diagnosis

  const treatmentPlan =
    rapport?.planTraitement ||
    medicalReport?.treatmentPlan?.medications ||
    reportContent?.treatmentPlan

  const hasStructuredContent = chiefComplaint || historyOfIllness || physicalExam || diagnosis

  // For compteRendu, we can build a narrative-like display
  const hasCompteRendu = compteRendu && (rapport?.motifConsultation || rapport?.syntheseDiagnostique)

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
          {physicalExam && (
            <ReportSection title="PHYSICAL EXAMINATION" content={physicalExam} />
          )}
          {diagnosis && (
            <ReportSection title="DIAGNOSIS" content={diagnosis} />
          )}
          {treatmentPlan && (
            <ReportSection title="TREATMENT PLAN" content={treatmentPlan} />
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
          const name = typeof med === 'string' ? med : med.name || med.medication || med.medicament
          const dosage = med.dosage || med.dose
          const frequency = med.frequency || med.posology || med.frequence
          const duration = med.duration || med.duree
          const quantity = med.quantity || med.quantite
          const instructions = med.instructions || med.note

          return (
            <div key={idx} className="space-y-1">
              <p className="font-semibold">{idx + 1}. {name}</p>
              {dosage && <p className="text-gray-700 ml-4">Dosage: {dosage}</p>}
              {frequency && <p className="text-gray-700 ml-4">Frequency: {frequency}</p>}
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
          <ul className="space-y-1 ml-2">
            {tests.map((test: any, idx: number) => {
              const testName = typeof test === 'string' ? test : test.name || test.test || test.testName
              const isUrgent = test.urgent || test.isUrgent || test.priority === 'urgent'
              return (
                <li key={idx} className="text-gray-700">
                  • {testName} {isUrgent && <span className="text-red-600 font-medium">[URGENT]</span>}
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

function ImagingTab({ imaging, fullReport }: { imaging: any[], fullReport: any }) {
  const imagingData = fullReport?.imaging_requests

  // Get imaging from imaging_requests structure - check multiple paths
  let imagingRequests = imagingData?.examinations || imagingData?.content?.examinations || imaging || []

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
          const name = typeof exam === 'string' ? exam : exam.name || exam.examination || exam.type
          const indication = exam.indication || exam.reason || exam.justification

          return (
            <div key={idx} className="space-y-1">
              <p className="font-semibold">{idx + 1}. {name}</p>
              {indication && <p className="text-gray-700 ml-4">Indication: {indication}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DietPlanTab({ dietPlan, followUp, fullReport }: { dietPlan: any, followUp: any, fullReport: any }) {
  const hasDietPlan = dietPlan && Object.keys(dietPlan).length > 0
  const hasFollowUp = followUp && Object.keys(followUp).length > 0

  // Try to extract from different report structures
  const mealPlan = dietPlan?.mealPlan || fullReport?.dietaryPlan?.mealPlan || fullReport?.mealPlan
  const supplements = dietPlan?.supplements || fullReport?.dietaryPlan?.supplements || []
  const followUpSchedule = followUp?.schedule || fullReport?.followUp?.schedule || fullReport?.suivi

  if (!hasDietPlan && !hasFollowUp && !mealPlan) {
    return (
      <Card className="bg-gray-50">
        <CardContent className="p-8 text-center">
          <Salad className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No diet plan or follow-up information available for this consultation.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Diet Plan Section */}
      {(hasDietPlan || mealPlan) && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Salad className="h-5 w-5 text-green-600" />
              Diet Plan
            </h3>
          </div>
          <Separator />

          {mealPlan && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <div className="space-y-4">
                  {mealPlan.breakfast && (
                    <div>
                      <h4 className="font-semibold text-green-800">🌅 Breakfast</h4>
                      <p className="text-sm text-gray-700">{mealPlan.breakfast}</p>
                    </div>
                  )}
                  {mealPlan.lunch && (
                    <div>
                      <h4 className="font-semibold text-green-800">☀️ Lunch</h4>
                      <p className="text-sm text-gray-700">{mealPlan.lunch}</p>
                    </div>
                  )}
                  {mealPlan.dinner && (
                    <div>
                      <h4 className="font-semibold text-green-800">🌙 Dinner</h4>
                      <p className="text-sm text-gray-700">{mealPlan.dinner}</p>
                    </div>
                  )}
                  {mealPlan.snacks && (
                    <div>
                      <h4 className="font-semibold text-green-800">🍎 Snacks</h4>
                      <p className="text-sm text-gray-700">{mealPlan.snacks}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {supplements && supplements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Supplements</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {supplements.map((supp: any, idx: number) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Pill className="h-4 w-4 text-blue-500" />
                      <span>{typeof supp === 'string' ? supp : `${supp.supplement || supp.name} - ${supp.dosage || ''}`}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Follow-up Section */}
      {(hasFollowUp || followUpSchedule) && (
        <>
          <div className="flex items-center justify-between mt-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-blue-600" />
              Follow-up Schedule
            </h3>
          </div>
          <Separator />

          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              {followUpSchedule && (
                <div className="space-y-2">
                  {typeof followUpSchedule === 'string' ? (
                    <p className="text-sm text-gray-700">{followUpSchedule}</p>
                  ) : (
                    <>
                      {followUpSchedule.nextVisit && (
                        <p className="text-sm"><strong>Next Visit:</strong> {followUpSchedule.nextVisit}</p>
                      )}
                      {followUpSchedule.frequency && (
                        <p className="text-sm"><strong>Frequency:</strong> {followUpSchedule.frequency}</p>
                      )}
                      {followUpSchedule.notes && (
                        <p className="text-sm"><strong>Notes:</strong> {followUpSchedule.notes}</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ============ HELPER COMPONENTS ============

interface SectionProps {
  icon: React.ReactNode
  title: string
  badge?: number
  children: React.ReactNode
}

function Section({ icon, title, badge, children }: SectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="font-semibold text-lg">{title}</h3>
        {badge !== undefined && (
          <Badge variant="secondary">{badge}</Badge>
        )}
      </div>
      <Separator />
      {children}
    </div>
  )
}

function VitalSignItem({ label, value }: { label: string, value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <p className="text-xs text-gray-500 font-medium uppercase mb-1">{label}</p>
        <p className="text-lg font-semibold text-gray-800">{value}</p>
      </CardContent>
    </Card>
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
  if (dietaryPlan && Object.keys(dietaryPlan).length > 0) return dietaryPlan
  // New document format
  if (fullReport?.diet_plan?.content) return fullReport.diet_plan.content
  // Old formats
  return fullReport?.dietaryPlan ||
         fullReport?.mealPlan ||
         fullReport?.diet ||
         {}
}

function extractFollowUp(fullReport: any): any {
  // New document format
  if (fullReport?.follow_up?.content) return fullReport.follow_up.content
  // Old formats
  return fullReport?.followUp ||
         fullReport?.suivi ||
         fullReport?.medicalReport?.followUp ||
         {}
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
