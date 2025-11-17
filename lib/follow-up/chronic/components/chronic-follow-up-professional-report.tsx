'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from '@/components/ui/use-toast'
import {
  FileText, Loader2, AlertCircle, CheckCircle, Download, RefreshCw,
  TrendingUp, Heart, Pill, Activity, Edit, Eye, Save, FileCheck, Lock,
  Calendar, FileSignature, DollarSign
} from 'lucide-react'
import type { ConsultationHistoryItem, PatientDemographics } from '@/lib/follow-up/shared'

export interface ChronicFollowUpProfessionalReportProps {
  patientDemographics: PatientDemographics | null
  clinicalData: any
  trendsData: any
  previousConsultation: ConsultationHistoryItem | null
  consultationHistory: ConsultationHistoryItem[]
  consultationId?: string
  onReportGenerated?: (report: any) => void
}

export function ChronicFollowUpProfessionalReport({
  patientDemographics, clinicalData, trendsData, previousConsultation,
  consultationHistory, consultationId, onReportGenerated
}: ChronicFollowUpProfessionalReportProps) {
  // State management
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<any>(null)
  const [editMode, setEditMode] = useState(false)
  const [validationStatus, setValidationStatus] = useState<'draft' | 'validated'>('draft')
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Doctor info state
  const [doctorInfo, setDoctorInfo] = useState({
    nom: "Dr. [Name Required]",
    qualifications: "MBBS, MD",
    specialite: "General Medicine",
    numeroEnregistrement: "[MCM Registration Required]",
    adresseCabinet: "Medical Clinic Address",
    telephone: "+230 XXX XXXX",
    email: "doctor@example.com",
    heuresConsultation: "Mon-Fri: 9:00-17:00"
  })

  // Sick leave state
  const [sickLeaveData, setSickLeaveData] = useState({
    startDate: '',
    endDate: '',
    numberOfDays: 0,
    medicalReason: '',
    remarks: ''
  })

  // Invoice state
  const [invoiceData, setInvoiceData] = useState({
    consultationFee: 0,
    additionalCharges: [],
    total: 0
  })

  // Load doctor info from sessionStorage
  useEffect(() => {
    const storedInfo = sessionStorage.getItem('currentDoctorInfo')
    if (storedInfo) {
      try {
        setDoctorInfo(JSON.parse(storedInfo))
      } catch (e) {
        console.error('Error loading doctor info:', e)
      }
    }
  }, [])

  // Generate report on mount
  useEffect(() => {
    if (clinicalData && patientDemographics && trendsData) {
      generateReport()
    }
  }, [clinicalData, patientDemographics, trendsData])

  const generateReport = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/chronic-follow-up-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientDemographics, clinicalData, trendsData, previousConsultation,
          consultationHistory: consultationHistory.slice(0, 5)
        })
      })
      if (!response.ok) throw new Error('Failed to generate report')
      const data = await response.json()
      setReport(data.report)
      onReportGenerated?.(data.report)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Save draft to database
  const handleSave = useCallback(async () => {
    if (!consultationId) {
      toast({
        title: "Cannot Save",
        description: "No consultation ID available",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    try {
      // Save to consultation_drafts
      const response = await fetch('/api/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId,
          reportContent: {
            chronicFollowUpReport: report,
            sickLeave: sickLeaveData,
            invoice: invoiceData
          },
          doctorInfo,
          modifiedSections: [],
          validationStatus
        })
      })

      if (!response.ok) throw new Error('Failed to save draft')

      setHasUnsavedChanges(false)
      toast({
        title: "Changes Saved",
        description: "Draft saved successfully to database"
      })
    } catch (err) {
      toast({
        title: "Save Error",
        description: err instanceof Error ? err.message : "Failed to save",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }, [consultationId, report, sickLeaveData, invoiceData, doctorInfo, validationStatus])

  // Validate and sign - save to consultation_records
  const handleValidation = useCallback(async () => {
    if (validationStatus === 'validated') return
    if (!consultationId || !patientDemographics) {
      toast({
        title: "Cannot Validate",
        description: "Missing required information",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    try {
      // Prepare report in the format expected by save-medical-report API
      const formattedReport = {
        compteRendu: {
          praticien: {
            nom: doctorInfo.nom,
            qualifications: doctorInfo.qualifications,
            specialite: doctorInfo.specialite,
            numeroEnregistrement: doctorInfo.numeroEnregistrement,
            email: doctorInfo.email,
            adresseCabinet: doctorInfo.adresseCabinet,
            telephone: doctorInfo.telephone,
            heuresConsultation: doctorInfo.heuresConsultation
          },
          patient: {
            nom: patientDemographics.fullName,
            age: `${patientDemographics.age} ans`,
            dateNaissance: patientDemographics.dateOfBirth || '',
            sexe: patientDemographics.gender,
            adresse: patientDemographics.address || '',
            telephone: patientDemographics.phone || '',
            email: patientDemographics.email || ''
          },
          rapport: {
            motifConsultation: report?.chiefComplaint || clinicalData?.chiefComplaint || 'Chronic Disease Follow-Up',
            antecedentsMedicaux: report?.trendAnalysis || '',
            examenClinique: report?.clinicalAssessment || '',
            conclusionDiagnostique: report?.diagnosis || '',
            planTraitement: report?.treatmentPlan || '',
            recommandations: report?.recommendations || '',
            planSuivi: report?.followUpPlan || ''
          },
          metadata: {
            dateGeneration: new Date().toISOString(),
            typeConsultation: 'chronic_follow_up',
            validationStatus: 'validated'
          }
        },
        ordonnances: {
          ...(sickLeaveData.numberOfDays > 0 && {
            arretMaladie: {
              enTete: doctorInfo,
              patient: {
                nom: patientDemographics.fullName,
                age: `${patientDemographics.age} ans`,
                dateNaissance: patientDemographics.dateOfBirth || '',
                adresse: patientDemographics.address || ''
              },
              certificat: {
                dateDebut: sickLeaveData.startDate,
                dateFin: sickLeaveData.endDate,
                nombreJours: sickLeaveData.numberOfDays,
                motifMedical: sickLeaveData.medicalReason,
                remarques: sickLeaveData.remarks
              },
              authentification: {
                signature: "Medical Practitioner's Signature",
                nomEnCapitales: doctorInfo.nom.toUpperCase(),
                numeroEnregistrement: doctorInfo.numeroEnregistrement,
                date: new Date().toISOString().split('T')[0]
              }
            }
          })
        },
        ...(invoiceData.total > 0 && {
          invoice: {
            physician: {
              name: doctorInfo.nom,
              registrationNumber: doctorInfo.numeroEnregistrement,
              address: doctorInfo.adresseCabinet,
              phone: doctorInfo.telephone,
              email: doctorInfo.email
            },
            patient: {
              name: patientDemographics.fullName,
              age: patientDemographics.age,
              address: patientDemographics.address || ''
            },
            items: [
              {
                description: 'Chronic Disease Follow-Up Consultation',
                amount: invoiceData.consultationFee
              },
              ...(invoiceData.additionalCharges || [])
            ],
            totalAmount: invoiceData.total,
            dateIssued: new Date().toISOString().split('T')[0]
          }
        })
      }

      // Save to consultation_records
      const response = await fetch('/api/save-medical-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationId,
          patientId: patientDemographics.patientId,
          doctorId: doctorInfo.numeroEnregistrement,
          doctorName: doctorInfo.nom,
          patientName: patientDemographics.fullName,
          report: formattedReport,
          action: 'finalize',
          metadata: {
            signatures: {},
            documentValidations: {}
          },
          patientData: {
            name: patientDemographics.fullName,
            age: patientDemographics.age,
            gender: patientDemographics.gender,
            email: patientDemographics.email,
            phone: patientDemographics.phone,
            birthDate: patientDemographics.dateOfBirth
          },
          clinicalData,
          diagnosisData: {
            diagnosis: report?.diagnosis,
            treatmentPlan: report?.treatmentPlan
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to validate report')
      }

      setValidationStatus('validated')
      setHasUnsavedChanges(false)

      toast({
        title: "Report Validated",
        description: "Report has been validated and saved. Documents sent to patient dashboard.",
        duration: 5000
      })
    } catch (err) {
      toast({
        title: "Validation Error",
        description: err instanceof Error ? err.message : "Failed to validate",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }, [validationStatus, consultationId, patientDemographics, report, doctorInfo, sickLeaveData, invoiceData, clinicalData])

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-red-600" />
          <p className="text-lg font-medium">Generating Chronic Disease Follow-Up Report...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!report) return null

  return (
    <div className="space-y-6">
      {/* Success banner */}
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          ✅ Chronic disease follow-up report generated with long-term trend analysis
        </AlertDescription>
      </Alert>

      {/* Action buttons */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge className={validationStatus === 'validated' ? 'bg-green-600' : 'bg-blue-600'}>
                {validationStatus === 'validated' ? (
                  <>
                    <Lock className="h-3 w-3 mr-1" />
                    Validated & Signed
                  </>
                ) : (
                  'Draft'
                )}
              </Badge>
              {hasUnsavedChanges && (
                <Badge variant="outline" className="border-orange-400 text-orange-700">
                  Unsaved Changes
                </Badge>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setEditMode(!editMode)}
                disabled={validationStatus === 'validated'}
                size="sm"
              >
                {editMode ? <Eye className="h-4 w-4 mr-2" /> : <Edit className="h-4 w-4 mr-2" />}
                {editMode ? 'Preview' : 'Edit'}
              </Button>

              {hasUnsavedChanges && consultationId && (
                <Button
                  variant="secondary"
                  onClick={handleSave}
                  disabled={saving || validationStatus === 'validated'}
                  size="sm"
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Changes
                </Button>
              )}

              <Button
                onClick={handleValidation}
                disabled={saving || validationStatus === 'validated' || hasUnsavedChanges}
                size="sm"
              >
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileCheck className="h-4 w-4 mr-2" />}
                {validationStatus === 'validated' ? 'Validated' : 'Validate & Sign'}
              </Button>

              <Button variant="outline" onClick={generateReport} size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main report tabs */}
      <Tabs defaultValue="report" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="report">
            <FileText className="h-4 w-4 mr-2" />
            Medical Report
          </TabsTrigger>
          <TabsTrigger value="sick-leave">
            <Calendar className="h-4 w-4 mr-2" />
            Sick Leave
          </TabsTrigger>
          <TabsTrigger value="invoice">
            <DollarSign className="h-4 w-4 mr-2" />
            Invoice
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileSignature className="h-4 w-4 mr-2" />
            All Documents
          </TabsTrigger>
        </TabsList>

        {/* Report Tab */}
        <TabsContent value="report">
          <Card>
            <CardHeader className="bg-gradient-to-r from-red-50 to-pink-50 border-b">
              {/* Doctor Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-lg text-red-900">{doctorInfo.nom}</h3>
                  <p className="text-sm text-red-700">{doctorInfo.qualifications}</p>
                  <p className="text-sm text-red-700">{doctorInfo.specialite}</p>
                  <p className="text-xs text-gray-600 mt-1">MCM Registration: {doctorInfo.numeroEnregistrement}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="text-gray-600">{doctorInfo.adresseCabinet}</p>
                  <p className="text-gray-600">{doctorInfo.telephone}</p>
                  <p className="text-gray-600">{doctorInfo.email}</p>
                  <p className="text-xs text-gray-500 mt-1">{doctorInfo.heuresConsultation}</p>
                </div>
              </div>

              <Separator className="my-4" />

              <CardTitle className="flex items-center gap-2">
                <Heart className="h-6 w-6 text-red-600" />
                Chronic Disease Follow-Up Report
              </CardTitle>
              <CardDescription>
                Patient: {patientDemographics?.fullName} • Date: {new Date().toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {report.patientInfo && (
                <section>
                  <h3 className="font-bold text-lg mb-3">Patient Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    {editMode ? (
                      <Textarea
                        value={report.patientInfo}
                        onChange={(e) => {
                          setReport({ ...report, patientInfo: e.target.value })
                          setHasUnsavedChanges(true)
                        }}
                        className="min-h-[100px]"
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm font-sans">{report.patientInfo}</pre>
                    )}
                  </div>
                </section>
              )}

              <Separator />

              {report.chiefComplaint && (
                <section className="border-l-4 border-red-500 pl-4 py-2">
                  <h3 className="font-bold text-lg mb-2">CHIEF COMPLAINT</h3>
                  {editMode ? (
                    <Textarea
                      value={report.chiefComplaint}
                      onChange={(e) => {
                        setReport({ ...report, chiefComplaint: e.target.value })
                        setHasUnsavedChanges(true)
                      }}
                      className="min-h-[80px]"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{report.chiefComplaint}</p>
                  )}
                </section>
              )}

              {report.trendAnalysis && (
                <section className="border-l-4 border-purple-500 pl-4 py-2">
                  <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    LONG-TERM TREND ANALYSIS
                  </h3>
                  {editMode ? (
                    <Textarea
                      value={report.trendAnalysis}
                      onChange={(e) => {
                        setReport({ ...report, trendAnalysis: e.target.value })
                        setHasUnsavedChanges(true)
                      }}
                      className="min-h-[120px]"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{report.trendAnalysis}</p>
                  )}
                </section>
              )}

              {report.clinicalAssessment && (
                <section className="border-l-4 border-blue-500 pl-4 py-2">
                  <h3 className="font-bold text-lg mb-2">CLINICAL ASSESSMENT</h3>
                  {editMode ? (
                    <Textarea
                      value={report.clinicalAssessment}
                      onChange={(e) => {
                        setReport({ ...report, clinicalAssessment: e.target.value })
                        setHasUnsavedChanges(true)
                      }}
                      className="min-h-[120px]"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{report.clinicalAssessment}</p>
                  )}
                </section>
              )}

              {report.medicationCompliance && (
                <section className="border-l-4 border-green-500 pl-4 py-2">
                  <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                    <Pill className="h-5 w-5" />
                    MEDICATION COMPLIANCE
                  </h3>
                  {editMode ? (
                    <Textarea
                      value={report.medicationCompliance}
                      onChange={(e) => {
                        setReport({ ...report, medicationCompliance: e.target.value })
                        setHasUnsavedChanges(true)
                      }}
                      className="min-h-[100px]"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{report.medicationCompliance}</p>
                  )}
                </section>
              )}

              {report.diagnosis && (
                <section className="border-l-4 border-orange-500 pl-4 py-2">
                  <h3 className="font-bold text-lg mb-2">DIAGNOSIS</h3>
                  {editMode ? (
                    <Textarea
                      value={report.diagnosis}
                      onChange={(e) => {
                        setReport({ ...report, diagnosis: e.target.value })
                        setHasUnsavedChanges(true)
                      }}
                      className="min-h-[100px]"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{report.diagnosis}</p>
                  )}
                </section>
              )}

              {report.treatmentPlan && (
                <section className="border-l-4 border-teal-500 pl-4 py-2">
                  <h3 className="font-bold text-lg mb-2">TREATMENT PLAN</h3>
                  {editMode ? (
                    <Textarea
                      value={report.treatmentPlan}
                      onChange={(e) => {
                        setReport({ ...report, treatmentPlan: e.target.value })
                        setHasUnsavedChanges(true)
                      }}
                      className="min-h-[120px]"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{report.treatmentPlan}</p>
                  )}
                </section>
              )}

              {report.recommendations && (
                <section className="border-l-4 border-pink-500 pl-4 py-2">
                  <h3 className="font-bold text-lg mb-2">RECOMMENDATIONS</h3>
                  {editMode ? (
                    <Textarea
                      value={report.recommendations}
                      onChange={(e) => {
                        setReport({ ...report, recommendations: e.target.value })
                        setHasUnsavedChanges(true)
                      }}
                      className="min-h-[100px]"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{report.recommendations}</p>
                  )}
                </section>
              )}

              {report.followUpPlan && (
                <section className="border-l-4 border-yellow-500 pl-4 py-2">
                  <h3 className="font-bold text-lg mb-2">FOLLOW-UP PLAN</h3>
                  {editMode ? (
                    <Textarea
                      value={report.followUpPlan}
                      onChange={(e) => {
                        setReport({ ...report, followUpPlan: e.target.value })
                        setHasUnsavedChanges(true)
                      }}
                      className="min-h-[100px]"
                    />
                  ) : (
                    <p className="whitespace-pre-wrap">{report.followUpPlan}</p>
                  )}
                </section>
              )}

              {/* Doctor Footer */}
              <Separator className="my-6" />
              <div className="mt-8 pt-6 border-t-2 border-gray-800">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-600">Medical Report Generated by:</p>
                    <p className="font-semibold text-gray-800">{doctorInfo.nom}</p>
                    <p className="text-sm text-gray-600">MCM: {doctorInfo.numeroEnregistrement}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 mb-4">Medical Practitioner's Signature:</p>
                    <div className="mb-2">
                      <p className="border-b-2 border-gray-400 w-64 mb-1"></p>
                      <p className="text-sm text-gray-600">Date: {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sick Leave Tab */}
        <TabsContent value="sick-leave">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Medical Certificate / Sick Leave
              </CardTitle>
              <CardDescription>Issue a sick leave certificate if needed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={sickLeaveData.startDate}
                    onChange={(e) => {
                      setSickLeaveData({ ...sickLeaveData, startDate: e.target.value })
                      setHasUnsavedChanges(true)
                      // Auto-calculate days if both dates are set
                      if (sickLeaveData.endDate && e.target.value) {
                        const start = new Date(e.target.value)
                        const end = new Date(sickLeaveData.endDate)
                        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1
                        setSickLeaveData(prev => ({ ...prev, numberOfDays: days > 0 ? days : 0 }))
                      }
                    }}
                    disabled={validationStatus === 'validated'}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={sickLeaveData.endDate}
                    onChange={(e) => {
                      setSickLeaveData({ ...sickLeaveData, endDate: e.target.value })
                      setHasUnsavedChanges(true)
                      // Auto-calculate days
                      if (sickLeaveData.startDate && e.target.value) {
                        const start = new Date(sickLeaveData.startDate)
                        const end = new Date(e.target.value)
                        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)) + 1
                        setSickLeaveData(prev => ({ ...prev, numberOfDays: days > 0 ? days : 0 }))
                      }
                    }}
                    disabled={validationStatus === 'validated'}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="numberOfDays">Number of Days</Label>
                <Input
                  id="numberOfDays"
                  type="number"
                  value={sickLeaveData.numberOfDays}
                  onChange={(e) => {
                    setSickLeaveData({ ...sickLeaveData, numberOfDays: parseInt(e.target.value) || 0 })
                    setHasUnsavedChanges(true)
                  }}
                  disabled={validationStatus === 'validated'}
                />
              </div>

              <div>
                <Label htmlFor="medicalReason">Medical Reason</Label>
                <Textarea
                  id="medicalReason"
                  value={sickLeaveData.medicalReason}
                  onChange={(e) => {
                    setSickLeaveData({ ...sickLeaveData, medicalReason: e.target.value })
                    setHasUnsavedChanges(true)
                  }}
                  placeholder="Medical reason for sick leave..."
                  className="min-h-[100px]"
                  disabled={validationStatus === 'validated'}
                />
              </div>

              <div>
                <Label htmlFor="remarks">Additional Remarks</Label>
                <Textarea
                  id="remarks"
                  value={sickLeaveData.remarks}
                  onChange={(e) => {
                    setSickLeaveData({ ...sickLeaveData, remarks: e.target.value })
                    setHasUnsavedChanges(true)
                  }}
                  placeholder="Any additional remarks..."
                  disabled={validationStatus === 'validated'}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoice Tab */}
        <TabsContent value="invoice">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Consultation Invoice
              </CardTitle>
              <CardDescription>Generate invoice for the consultation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="consultationFee">Consultation Fee (MUR)</Label>
                <Input
                  id="consultationFee"
                  type="number"
                  value={invoiceData.consultationFee}
                  onChange={(e) => {
                    const fee = parseFloat(e.target.value) || 0
                    setInvoiceData({ ...invoiceData, consultationFee: fee, total: fee })
                    setHasUnsavedChanges(true)
                  }}
                  disabled={validationStatus === 'validated'}
                />
              </div>

              <div className="pt-4 border-t">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span>Total Amount:</span>
                  <span>MUR {invoiceData.total.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All Documents Tab */}
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <CardTitle>All Documents Summary</CardTitle>
              <CardDescription>Overview of all generated documents</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Medical Report</p>
                    <p className="text-sm text-gray-600">Chronic disease follow-up report</p>
                  </div>
                </div>
                <Badge>Ready</Badge>
              </div>

              {sickLeaveData.numberOfDays > 0 && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">Sick Leave Certificate</p>
                      <p className="text-sm text-gray-600">{sickLeaveData.numberOfDays} days</p>
                    </div>
                  </div>
                  <Badge>Ready</Badge>
                </div>
              )}

              {invoiceData.total > 0 && (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium">Invoice</p>
                      <p className="text-sm text-gray-600">MUR {invoiceData.total.toFixed(2)}</p>
                    </div>
                  </div>
                  <Badge>Ready</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
