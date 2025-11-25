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
  User,
  Heart,
  AlertCircle,
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
      <DialogContent className="max-w-5xl max-h-[90vh]">
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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

          <div className="h-[calc(90vh-14rem)] overflow-y-auto mt-4 pr-2">
            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-4">
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
            </TabsContent>

            {/* REPORT TAB */}
            <TabsContent value="report" className="space-y-4">
              <ReportTab consultation={consultation} fullReport={fullReport} />
            </TabsContent>

            {/* PRESCRIPTION TAB */}
            <TabsContent value="prescription" className="space-y-4">
              <PrescriptionTab prescription={prescription} consultation={consultation} />
            </TabsContent>

            {/* LAB TESTS TAB */}
            <TabsContent value="labs" className="space-y-4">
              <LabTestsTab labTests={labTests} fullReport={fullReport} />
            </TabsContent>

            {/* IMAGING TAB */}
            <TabsContent value="imaging" className="space-y-4">
              <ImagingTab imaging={imaging} fullReport={fullReport} />
            </TabsContent>

            {/* DIET PLAN TAB (Chronic only) */}
            {isChronic && (
              <TabsContent value="diet" className="space-y-4">
                <DietPlanTab dietPlan={dietPlan} followUp={followUp} fullReport={fullReport} />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

// ============ TAB COMPONENTS ============

function ReportTab({ consultation, fullReport }: { consultation: ConsultationHistoryItem, fullReport: any }) {
  // Extract report data from different formats
  const compteRendu = fullReport?.compteRendu
  const medicalReport = fullReport?.medicalReport
  // Check for root-level patient data (direct format)
  const rootPatient = fullReport?.patient
  const hasRootData = rootPatient || fullReport?.dietaryPlan || fullReport?.nutritionalAssessment

  // New document format (consultation_report, diet_plan, etc.)
  const consultationReport = fullReport?.consultation_report
  const hasDocumentFormat = consultationReport || fullReport?.diet_plan || fullReport?.prescriptions

  // Debug logging - show all content structures
  console.log('📄 ReportTab fullReport:', fullReport)
  if (consultationReport) {
    console.log('📄 consultation_report.content:', consultationReport.content)
    console.log('📄 consultation_report.content keys:', consultationReport.content ? Object.keys(consultationReport.content) : 'no content')
  }
  if (fullReport?.prescriptions) {
    console.log('📄 prescriptions:', fullReport.prescriptions)
    console.log('📄 prescriptions.content:', fullReport.prescriptions.content)
  }
  if (fullReport?.laboratory_requests) {
    console.log('📄 laboratory_requests:', fullReport.laboratory_requests)
  }
  if (fullReport?.imaging_requests) {
    console.log('📄 imaging_requests:', fullReport.imaging_requests)
  }
  if (fullReport?.diet_plan) {
    console.log('📄 diet_plan:', fullReport.diet_plan)
    console.log('📄 diet_plan.content:', fullReport.diet_plan.content)
  }

  // Get content with multiple possible field names
  const reportContent = consultationReport?.content || {}
  const getField = (obj: any, ...keys: string[]) => {
    for (const key of keys) {
      if (obj?.[key]) return obj[key]
    }
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Compte Rendu Médical
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleDownloadReport(consultation)}
        >
          <Download className="h-4 w-4 mr-1" />
          Télécharger
        </Button>
      </div>
      <Separator />

      {/* New Document Format (consultation_report, diet_plan, prescriptions, etc.) */}
      {hasDocumentFormat && (
        <div className="space-y-4">
          {/* Consultation Report */}
          {consultationReport?.content && (
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-800">
                  {consultationReport.title || 'Compte Rendu de Consultation'}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2 space-y-4">
                {/* Patient Info from consultation_report */}
                {consultationReport.patient && (
                  <div className="bg-gray-50 p-3 rounded">
                    <h4 className="font-medium text-gray-700 mb-2">Patient</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                      {consultationReport.patient.nom && (
                        <div><span className="font-medium">Nom:</span> {consultationReport.patient.nom}</div>
                      )}
                      {consultationReport.patient.age && (
                        <div><span className="font-medium">Âge:</span> {consultationReport.patient.age} ans</div>
                      )}
                      {consultationReport.patient.sexe && (
                        <div><span className="font-medium">Sexe:</span> {consultationReport.patient.sexe}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Report Content - render dynamically based on available fields */}
                {renderReportContent(consultationReport.content)}
              </CardContent>
            </Card>
          )}

          {/* Practitioner Info */}
          {consultationReport?.praticien && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium text-blue-800">Praticien:</span>{' '}
                    <span className="text-blue-700">{consultationReport.praticien.nom}</span>
                    {consultationReport.praticien.specialite && (
                      <span className="text-blue-600 ml-2">({consultationReport.praticien.specialite})</span>
                    )}
                  </div>
                  {consultationReport.praticien.etablissement && (
                    <div className="text-blue-600">{consultationReport.praticien.etablissement}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Follow-up Info */}
          {fullReport?.follow_up?.content && (
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-800">Suivi</CardTitle>
              </CardHeader>
              <CardContent className="pt-2 space-y-2 text-sm">
                {fullReport.follow_up.content.nextAppointment && (
                  <div>
                    <span className="font-medium">Prochain RDV:</span>{' '}
                    {fullReport.follow_up.content.nextAppointment}
                  </div>
                )}
                {fullReport.follow_up.content.frequency && (
                  <div>
                    <span className="font-medium">Fréquence:</span>{' '}
                    {fullReport.follow_up.content.frequency}
                  </div>
                )}
                {fullReport.follow_up.content.instructions && (
                  <div>
                    <span className="font-medium">Instructions:</span>
                    <p className="text-gray-600 mt-1">{fullReport.follow_up.content.instructions}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Root-level data format (direct patient/diet data) */}
      {hasRootData && !compteRendu && !medicalReport && !hasDocumentFormat && (
        <div className="space-y-4">
          {/* Patient Info from root */}
          {rootPatient && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Informations Patient
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {(rootPatient.nom || rootPatient.name) && (
                    <div><span className="font-medium">Nom:</span> {rootPatient.nom || rootPatient.name}</div>
                  )}
                  {rootPatient.age && (
                    <div><span className="font-medium">Âge:</span> {rootPatient.age} ans</div>
                  )}
                  {(rootPatient.sexe || rootPatient.gender) && (
                    <div><span className="font-medium">Sexe:</span> {rootPatient.sexe || rootPatient.gender}</div>
                  )}
                  {rootPatient.email && (
                    <div><span className="font-medium">Email:</span> {rootPatient.email}</div>
                  )}
                  {(rootPatient.poids || rootPatient.weight) && (
                    <div><span className="font-medium">Poids:</span> {rootPatient.poids || rootPatient.weight} kg</div>
                  )}
                  {(rootPatient.taille || rootPatient.height) && (
                    <div><span className="font-medium">Taille:</span> {rootPatient.taille || rootPatient.height} cm</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Nutritional Assessment */}
          {fullReport?.nutritionalAssessment && (
            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-800">Évaluation Nutritionnelle</CardTitle>
              </CardHeader>
              <CardContent className="pt-2 space-y-2">
                {fullReport.nutritionalAssessment.currentDiet && (
                  <div>
                    <span className="font-medium">État Actuel:</span>
                    <p className="text-gray-700 bg-gray-50 p-2 rounded mt-1">{fullReport.nutritionalAssessment.currentDiet}</p>
                  </div>
                )}
                {fullReport.nutritionalAssessment.culturalConsiderations && (
                  <div>
                    <span className="font-medium">Considérations Culturelles:</span>
                    <p className="text-gray-600 text-sm">{fullReport.nutritionalAssessment.culturalConsiderations}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Nutritional Guidelines */}
          {fullReport?.nutritionalGuidelines && (
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-800">Recommandations Nutritionnelles</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {fullReport.nutritionalGuidelines.caloriesTarget && (
                    <div className="bg-blue-50 p-2 rounded">
                      <span className="font-medium text-blue-800">Calories:</span>
                      <p className="text-blue-700">{fullReport.nutritionalGuidelines.caloriesTarget}</p>
                    </div>
                  )}
                  {fullReport.nutritionalGuidelines.hydration && (
                    <div className="bg-blue-50 p-2 rounded">
                      <span className="font-medium text-blue-800">Hydratation:</span>
                      <p className="text-blue-700">{fullReport.nutritionalGuidelines.hydration}</p>
                    </div>
                  )}
                  {fullReport.nutritionalGuidelines.macronutrients && (
                    <div className="bg-blue-50 p-2 rounded">
                      <span className="font-medium text-blue-800">Macros:</span>
                      <p className="text-blue-700 text-xs">
                        P: {fullReport.nutritionalGuidelines.macronutrients.protein} |
                        G: {fullReport.nutritionalGuidelines.macronutrients.carbs} |
                        L: {fullReport.nutritionalGuidelines.macronutrients.fat}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Special Instructions */}
          {fullReport?.specialInstructions && fullReport.specialInstructions.length > 0 && (
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-800">Instructions Spéciales</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                  {fullReport.specialInstructions.map((instruction: string, idx: number) => (
                    <li key={idx}>{instruction}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Cooking Methods */}
          {fullReport?.cookingMethods && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Méthodes de Cuisson</CardTitle>
              </CardHeader>
              <CardContent className="pt-2 grid grid-cols-2 gap-4">
                {fullReport.cookingMethods.recommended && (
                  <div>
                    <span className="font-medium text-green-700">Recommandées:</span>
                    <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                      {fullReport.cookingMethods.recommended.map((method: string, idx: number) => (
                        <li key={idx}>{method}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {fullReport.cookingMethods.avoid && (
                  <div>
                    <span className="font-medium text-red-700">À Éviter:</span>
                    <ul className="list-disc list-inside text-sm text-gray-600 mt-1">
                      {fullReport.cookingMethods.avoid.map((method: string, idx: number) => (
                        <li key={idx}>{method}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Meal Prep Tips */}
          {fullReport?.mealPrepTips && fullReport.mealPrepTips.length > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-green-800">Conseils de Préparation</CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
                  {fullReport.mealPrepTips.map((tip: string, idx: number) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* French Format (compteRendu) */}
      {compteRendu && (
        <div className="space-y-4">
          {/* Header */}
          {compteRendu.header && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {compteRendu.header.etablissement && (
                    <div>
                      <span className="font-semibold text-blue-800">Établissement:</span>{' '}
                      <span className="text-blue-700">{compteRendu.header.etablissement}</span>
                    </div>
                  )}
                  {compteRendu.header.date && (
                    <div>
                      <span className="font-semibold text-blue-800">Date:</span>{' '}
                      <span className="text-blue-700">{compteRendu.header.date}</span>
                    </div>
                  )}
                  {compteRendu.header.consultationType && (
                    <div>
                      <span className="font-semibold text-blue-800">Type:</span>{' '}
                      <span className="text-blue-700">{compteRendu.header.consultationType}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Patient Info */}
          {compteRendu.patient && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Informations Patient
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {compteRendu.patient.nom && (
                    <div><span className="font-medium">Nom:</span> {compteRendu.patient.nom}</div>
                  )}
                  {compteRendu.patient.age && (
                    <div><span className="font-medium">Âge:</span> {compteRendu.patient.age} ans</div>
                  )}
                  {compteRendu.patient.sexe && (
                    <div><span className="font-medium">Sexe:</span> {compteRendu.patient.sexe}</div>
                  )}
                  {compteRendu.patient.poids && (
                    <div><span className="font-medium">Poids:</span> {compteRendu.patient.poids} kg</div>
                  )}
                  {compteRendu.patient.taille && (
                    <div><span className="font-medium">Taille:</span> {compteRendu.patient.taille} cm</div>
                  )}
                  {(compteRendu.patient.tensionSystolique || compteRendu.patient.bloodPressureSystolic) && (
                    <div>
                      <span className="font-medium">TA:</span>{' '}
                      {compteRendu.patient.tensionSystolique || compteRendu.patient.bloodPressureSystolic}/
                      {compteRendu.patient.tensionDiastolique || compteRendu.patient.bloodPressureDiastolic} mmHg
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rapport (Main Content) */}
          {compteRendu.rapport && (
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4 space-y-4">
                {compteRendu.rapport.motifConsultation && (
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-1">Motif de Consultation</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded">{compteRendu.rapport.motifConsultation}</p>
                  </div>
                )}
                {compteRendu.rapport.histoireMaladie && (
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-1">Histoire de la Maladie</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded whitespace-pre-wrap">{compteRendu.rapport.histoireMaladie}</p>
                  </div>
                )}
                {compteRendu.rapport.examenClinique && (
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-1">Examen Clinique</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded whitespace-pre-wrap">{compteRendu.rapport.examenClinique}</p>
                  </div>
                )}
                {compteRendu.rapport.syntheseDiagnostique && (
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-1">Synthèse Diagnostique</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded whitespace-pre-wrap">{compteRendu.rapport.syntheseDiagnostique}</p>
                  </div>
                )}
                {compteRendu.rapport.planTraitement && (
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-1">Plan de Traitement</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded whitespace-pre-wrap">{compteRendu.rapport.planTraitement}</p>
                  </div>
                )}
                {compteRendu.rapport.recommandations && (
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-1">Recommandations</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded whitespace-pre-wrap">{compteRendu.rapport.recommandations}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* English Format (medicalReport) */}
      {medicalReport && !compteRendu && (
        <div className="space-y-4">
          {/* Patient Info */}
          {medicalReport.patient && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Patient Information
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {medicalReport.patient.fullName && (
                    <div><span className="font-medium">Name:</span> {medicalReport.patient.fullName}</div>
                  )}
                  {medicalReport.patient.age && (
                    <div><span className="font-medium">Age:</span> {medicalReport.patient.age} years</div>
                  )}
                  {medicalReport.patient.gender && (
                    <div><span className="font-medium">Gender:</span> {medicalReport.patient.gender}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Clinical Evaluation */}
          {medicalReport.clinicalEvaluation && (
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4 space-y-4">
                {medicalReport.clinicalEvaluation.chiefComplaint && (
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-1">Chief Complaint</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded">{medicalReport.clinicalEvaluation.chiefComplaint}</p>
                  </div>
                )}
                {medicalReport.clinicalEvaluation.historyOfPresentIllness && (
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-1">History of Present Illness</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded whitespace-pre-wrap">{medicalReport.clinicalEvaluation.historyOfPresentIllness}</p>
                  </div>
                )}
                {medicalReport.clinicalEvaluation.physicalExamination && (
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-1">Physical Examination</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded whitespace-pre-wrap">{medicalReport.clinicalEvaluation.physicalExamination}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Diagnostic Summary */}
          {medicalReport.diagnosticSummary && (
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <h4 className="font-semibold text-green-800 mb-2">Diagnostic Summary</h4>
                <p className="text-gray-700 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                  {medicalReport.diagnosticSummary.diagnosticConclusion || JSON.stringify(medicalReport.diagnosticSummary, null, 2)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Treatment Plan */}
          {medicalReport.treatmentPlan && (
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="p-4">
                <h4 className="font-semibold text-purple-800 mb-2">Treatment Plan</h4>
                <p className="text-gray-700 bg-gray-50 p-3 rounded whitespace-pre-wrap">
                  {typeof medicalReport.treatmentPlan === 'string'
                    ? medicalReport.treatmentPlan
                    : JSON.stringify(medicalReport.treatmentPlan, null, 2)}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Fallback if no structured data at all */}
      {!compteRendu && !medicalReport && !hasRootData && !hasDocumentFormat && (
        <Card className="bg-gray-50">
          <CardContent className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Aucun rapport structuré disponible.</p>
            {fullReport && Object.keys(fullReport).length > 0 && (
              <div className="mt-4 text-left">
                <p className="text-sm text-gray-500 mb-2">Données brutes disponibles:</p>
                <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-64">
                  {JSON.stringify(fullReport, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PrescriptionTab({ prescription, consultation }: { prescription: any[], consultation: ConsultationHistoryItem }) {
  if (!prescription || prescription.length === 0) {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Pill className="h-5 w-5 text-purple-600" />
          Prescription ({prescription.length} medication{prescription.length > 1 ? 's' : ''})
        </h3>
      </div>
      <Separator />

      <div className="space-y-3">
        {prescription.map((med, idx) => (
          <MedicationCard key={idx} medication={med} index={idx + 1} />
        ))}
      </div>
    </div>
  )
}

function LabTestsTab({ labTests, fullReport }: { labTests: any[], fullReport: any }) {
  // Also check for recommended tests in the report
  const recommendedTests = fullReport?.medicalReport?.recommendedTests ||
                           fullReport?.compteRendu?.examensComplementaires?.biological || []

  if ((!labTests || labTests.length === 0) && (!recommendedTests || recommendedTests.length === 0)) {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TestTube className="h-5 w-5 text-cyan-600" />
          Laboratory Tests
        </h3>
      </div>
      <Separator />

      {/* Performed Tests */}
      {labTests && labTests.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Test Results</h4>
          {labTests.map((test, idx) => (
            <LabTestCard key={idx} test={test} />
          ))}
        </div>
      )}

      {/* Recommended Tests */}
      {recommendedTests && recommendedTests.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-sm text-amber-800">Recommended Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendedTests.map((test: any, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <TestTube className="h-4 w-4 text-amber-600 mt-0.5" />
                  <span>{typeof test === 'string' ? test : test.name || test.test || JSON.stringify(test)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ImagingTab({ imaging, fullReport }: { imaging: any[], fullReport: any }) {
  // Also check for recommended imaging in the report
  const recommendedImaging = fullReport?.medicalReport?.recommendedTests?.filter((t: any) =>
    t.type === 'imaging' || t.category === 'imaging'
  ) || fullReport?.compteRendu?.examensComplementaires?.imaging || []

  if ((!imaging || imaging.length === 0) && (!recommendedImaging || recommendedImaging.length === 0)) {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Scan className="h-5 w-5 text-indigo-600" />
          Imaging Studies
        </h3>
      </div>
      <Separator />

      {/* Performed Imaging */}
      {imaging && imaging.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-700">Completed Studies</h4>
          {imaging.map((study, idx) => (
            <Card key={idx} className="border-l-4 border-indigo-400">
              <CardContent className="p-4">
                <p className="font-semibold">{typeof study === 'string' ? study : study.name || study.type}</p>
                {study.findings && <p className="text-sm text-gray-600 mt-1">{study.findings}</p>}
                {study.date && <p className="text-xs text-gray-500 mt-1">Date: {study.date}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recommended Imaging */}
      {recommendedImaging && recommendedImaging.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-sm text-amber-800">Recommended Imaging</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {recommendedImaging.map((img: any, idx: number) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Scan className="h-4 w-4 text-amber-600 mt-0.5" />
                  <span>{typeof img === 'string' ? img : img.name || img.study || JSON.stringify(img)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
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

// ============ RENDER HELPERS ============

// Map of field names to display labels
const fieldLabels: Record<string, string> = {
  // French fields
  motifConsultation: 'Motif de Consultation',
  histoireMaladie: 'Histoire de la Maladie',
  examenClinique: 'Examen Clinique',
  syntheseDiagnostique: 'Synthèse Diagnostique',
  planTraitement: 'Plan de Traitement',
  recommandations: 'Recommandations',
  antecedents: 'Antécédents',
  conclusion: 'Conclusion',
  observations: 'Observations',
  // English fields
  chiefComplaint: 'Chief Complaint',
  historyOfPresentIllness: 'History of Present Illness',
  physicalExamination: 'Physical Examination',
  diagnosis: 'Diagnosis',
  diagnosticSummary: 'Diagnostic Summary',
  treatmentPlan: 'Treatment Plan',
  recommendations: 'Recommendations',
  assessment: 'Assessment',
  plan: 'Plan',
  followUp: 'Follow-up',
  notes: 'Notes',
  // Common
  summary: 'Summary',
  details: 'Details',
}

function renderReportContent(content: any): React.ReactNode {
  if (!content || typeof content !== 'object') return null

  const sections: React.ReactNode[] = []

  // Render each field in the content object
  Object.entries(content).forEach(([key, value]) => {
    if (!value) return

    // Skip certain fields that are not report content
    if (['type', 'signature', 'validated', 'date', 'timestamp'].includes(key)) return

    const label = fieldLabels[key] || formatFieldName(key)

    if (typeof value === 'string') {
      sections.push(
        <div key={key}>
          <h4 className="font-semibold text-blue-800 mb-1">{label}</h4>
          <p className="text-gray-700 bg-gray-50 p-3 rounded whitespace-pre-wrap">{value}</p>
        </div>
      )
    } else if (Array.isArray(value)) {
      sections.push(
        <div key={key}>
          <h4 className="font-semibold text-blue-800 mb-1">{label}</h4>
          <ul className="list-disc list-inside text-gray-700 bg-gray-50 p-3 rounded">
            {value.map((item, idx) => (
              <li key={idx}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
            ))}
          </ul>
        </div>
      )
    } else if (typeof value === 'object') {
      // Recursively render nested objects
      sections.push(
        <div key={key}>
          <h4 className="font-semibold text-blue-800 mb-1">{label}</h4>
          <div className="bg-gray-50 p-3 rounded">
            {renderNestedObject(value)}
          </div>
        </div>
      )
    }
  })

  return sections.length > 0 ? <div className="space-y-4">{sections}</div> : null
}

function renderNestedObject(obj: any): React.ReactNode {
  if (!obj || typeof obj !== 'object') return null

  return (
    <div className="space-y-2 text-sm">
      {Object.entries(obj).map(([key, value]) => {
        if (!value) return null
        const label = fieldLabels[key] || formatFieldName(key)

        if (typeof value === 'string' || typeof value === 'number') {
          return (
            <div key={key}>
              <span className="font-medium text-gray-600">{label}:</span>{' '}
              <span className="text-gray-800">{value}</span>
            </div>
          )
        } else if (Array.isArray(value)) {
          return (
            <div key={key}>
              <span className="font-medium text-gray-600">{label}:</span>
              <ul className="list-disc list-inside ml-2">
                {value.map((item, idx) => (
                  <li key={idx}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
                ))}
              </ul>
            </div>
          )
        }
        return null
      })}
    </div>
  )
}

function formatFieldName(key: string): string {
  // Convert camelCase or snake_case to Title Case
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^./, str => str.toUpperCase())
    .trim()
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

function MedicationCard({ medication, index }: { medication: any, index: number }) {
  const name = typeof medication === 'string' ? medication : medication.name || medication.medication
  const dosage = typeof medication === 'object' ? medication.dosage || medication.dose : null
  const frequency = typeof medication === 'object' ? medication.frequency || medication.posology : null
  const duration = typeof medication === 'object' ? medication.duration : null
  const instructions = typeof medication === 'object' ? medication.instructions : null

  return (
    <Card className="border-l-4 border-purple-400">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <span className="text-sm font-bold text-purple-600">{index}</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-800">{name}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {dosage && (
                <Badge variant="outline" className="text-xs">
                  <Pill className="h-3 w-3 mr-1" />
                  {dosage}
                </Badge>
              )}
              {frequency && (
                <Badge variant="outline" className="text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  {frequency}
                </Badge>
              )}
              {duration && (
                <Badge variant="outline" className="text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  {duration}
                </Badge>
              )}
            </div>
            {instructions && (
              <p className="text-sm text-gray-600 mt-2 italic">{instructions}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LabTestCard({ test }: { test: any }) {
  const name = typeof test === 'string' ? test : test.name || test.test
  const value = typeof test === 'object' ? test.value || test.result : null
  const unit = typeof test === 'object' ? test.unit : null
  const normalRange = typeof test === 'object' ? test.normalRange || test.reference : null
  const isAbnormal = typeof test === 'object' ? test.isAbnormal || test.abnormal : false

  return (
    <Card className={`border-l-4 ${isAbnormal ? 'border-red-400 bg-red-50' : 'border-cyan-400'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-800">{name}</p>
              {isAbnormal && (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
            </div>
            {value && (
              <p className="text-sm text-gray-600 mt-1">
                Result: <strong>{value}</strong> {unit}
                {normalRange && (
                  <span className="text-xs text-gray-500 ml-2">(Normal: {normalRange})</span>
                )}
              </p>
            )}
          </div>
        </div>
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
