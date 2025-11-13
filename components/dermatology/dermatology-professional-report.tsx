"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { CheckCircle, Download, FileText, Pill, TestTube, Scan, Calendar, Plus, Trash2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface Props {
  patientData: any
  imageData: any
  ocrAnalysisData: any
  questionsData: any
  diagnosisData: any
  onComplete: () => void
}

interface Medication {
  nom: string
  denominationCommune: string
  dosage: string
  forme: string
  posologie: string
  modeAdministration: string
  dureeTraitement: string
  quantite: string
  instructions: string
}

interface BiologyTest {
  nom: string
  categorie: string
  urgence: boolean
  aJeun: boolean
  motifClinique: string
}

interface ImagingExam {
  type: string
  region: string
  indicationClinique: string
  urgence: boolean
}

export default function DermatologyProfessionalReport(props: Props) {
  const [activeTab, setActiveTab] = useState("consultation")
  
  // Consultation Report State
  const [consultationReport, setConsultationReport] = useState(generateConsultationReport(props))
  
  // Medications State
  const [medications, setMedications] = useState<Medication[]>([])
  
  // Biology Tests State
  const [biologyTests, setBiologyTests] = useState<BiologyTest[]>([])
  
  // Imaging Exams State
  const [imagingExams, setImagingExams] = useState<ImagingExam[]>([])
  
  // Sick Leave State
  const [sickLeaveData, setSickLeaveData] = useState({
    startDate: '',
    endDate: '',
    numberOfDays: 0,
    medicalReason: '',
    remarks: '',
    workRestrictions: ''
  })

  function generateConsultationReport(data: any) {
    const patient = data.patientData
    const diagnosis = data.diagnosisData?.diagnosis?.fullText || 'Pending diagnosis'
    const ocrSummary = data.ocrAnalysisData?.summary || 'No imaging analysis available'
    
    return `DERMATOLOGY CONSULTATION REPORT

PATIENT INFORMATION:
Name: ${patient.firstName} ${patient.lastName}
Age: ${patient.age} years | Gender: ${patient.gender}
Date of Consultation: ${new Date().toLocaleDateString()}

CHIEF COMPLAINT:
Dermatological consultation with image analysis for skin condition assessment.

VISUAL EXAMINATION & IMAGING ANALYSIS:
${ocrSummary}

CLINICAL HISTORY:
${formatQuestionsData(data.questionsData)}

DERMATOLOGICAL ASSESSMENT:
${diagnosis}

CLINICAL FINDINGS:
- Visual observations from uploaded images analyzed using AI-powered dermatology specialist
- Detailed assessment of skin condition morphology, distribution, and characteristics
- Correlation with patient's clinical history and symptoms

DIFFERENTIAL DIAGNOSIS:
${extractDifferentialDiagnosis(diagnosis)}

MANAGEMENT PLAN:
Treatment recommendations and follow-up care as detailed in the prescription sections below.

PATIENT EDUCATION:
- Skin care recommendations specific to the diagnosed condition
- Warning signs that require immediate medical attention
- Lifestyle modifications if applicable

FOLLOW-UP:
Recommended follow-up in 2-4 weeks or sooner if symptoms worsen.

PHYSICIAN NOTES:
This is a comprehensive dermatological assessment combining AI-powered image analysis 
with clinical history and patient-reported symptoms.

Report Generated: ${new Date().toLocaleString()}
`
  }

  function formatQuestionsData(questionsData: any) {
    if (!questionsData?.answers) return 'No additional clinical history recorded.'
    
    const questions = questionsData.questions || []
    const answers = questionsData.answers || {}
    
    let formatted = ''
    questions.forEach((q: any) => {
      const answer = answers[q.id]
      if (answer) {
        formatted += `- ${q.question}: ${typeof answer === 'object' ? JSON.stringify(answer) : answer}\n`
      }
    })
    
    return formatted || 'No additional clinical history recorded.'
  }

  function extractDifferentialDiagnosis(diagnosisText: string) {
    // Try to extract differential diagnosis section from AI diagnosis
    const ddMatch = diagnosisText.match(/DIFFERENTIAL DIAGNOS[IE]S:(.*?)(?=\n\n[A-Z]|\n\d+\.|\Z)/is)
    if (ddMatch) {
      return ddMatch[1].trim()
    }
    return 'See detailed assessment above.'
  }

  // Medication Management
  const addMedication = useCallback(() => {
    setMedications(prev => [...prev, {
      nom: '',
      denominationCommune: '',
      dosage: '',
      forme: 'cream',
      posologie: '',
      modeAdministration: 'Topical route',
      dureeTraitement: '14 days',
      quantite: '1 tube',
      instructions: ''
    }])
  }, [])

  const updateMedication = useCallback((index: number, field: keyof Medication, value: string) => {
    setMedications(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }, [])

  const removeMedication = useCallback((index: number) => {
    setMedications(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Biology Test Management
  const addBiologyTest = useCallback(() => {
    setBiologyTests(prev => [...prev, {
      nom: '',
      categorie: 'clinicalChemistry',
      urgence: false,
      aJeun: false,
      motifClinique: ''
    }])
  }, [])

  const updateBiologyTest = useCallback((index: number, field: keyof BiologyTest, value: any) => {
    setBiologyTests(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }, [])

  const removeBiologyTest = useCallback((index: number) => {
    setBiologyTests(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Imaging Exam Management
  const addImagingExam = useCallback(() => {
    setImagingExams(prev => [...prev, {
      type: '',
      region: '',
      indicationClinique: '',
      urgence: false
    }])
  }, [])

  const updateImagingExam = useCallback((index: number, field: keyof ImagingExam, value: any) => {
    setImagingExams(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }, [])

  const removeImagingExam = useCallback((index: number) => {
    setImagingExams(prev => prev.filter((_, i) => i !== index))
  }, [])

  // Download Handlers
  const downloadConsultationReport = () => {
    const blob = new Blob([consultationReport], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dermatology-consultation-${props.patientData.lastName}-${Date.now()}.txt`
    a.click()
    toast({ title: "Downloaded", description: "Consultation report downloaded" })
  }

  const downloadPrescription = () => {
    const prescriptionText = generatePrescriptionText()
    const blob = new Blob([prescriptionText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dermatology-prescription-${props.patientData.lastName}-${Date.now()}.txt`
    a.click()
    toast({ title: "Downloaded", description: "Prescription downloaded" })
  }

  const downloadLabOrder = () => {
    const labText = generateLabOrderText()
    const blob = new Blob([labText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dermatology-lab-order-${props.patientData.lastName}-${Date.now()}.txt`
    a.click()
    toast({ title: "Downloaded", description: "Lab order downloaded" })
  }

  const downloadImagingOrder = () => {
    const imagingText = generateImagingOrderText()
    const blob = new Blob([imagingText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dermatology-imaging-order-${props.patientData.lastName}-${Date.now()}.txt`
    a.click()
    toast({ title: "Downloaded", description: "Imaging order downloaded" })
  }

  const downloadSickLeave = () => {
    const sickLeaveText = generateSickLeaveText()
    const blob = new Blob([sickLeaveText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dermatology-sick-leave-${props.patientData.lastName}-${Date.now()}.txt`
    a.click()
    toast({ title: "Downloaded", description: "Sick leave certificate downloaded" })
  }

  function generatePrescriptionText() {
    return `DERMATOLOGY PRESCRIPTION

Patient: ${props.patientData.firstName} ${props.patientData.lastName}
Date: ${new Date().toLocaleDateString()}

MEDICATIONS:
${medications.map((med, i) => `
${i + 1}. ${med.nom} ${med.dosage}
   Generic: ${med.denominationCommune}
   Form: ${med.forme}
   Dosage: ${med.posologie}
   Route: ${med.modeAdministration}
   Duration: ${med.dureeTraitement}
   Quantity: ${med.quantite}
   Instructions: ${med.instructions}
`).join('\n')}

Physician Signature: ________________
Date: ${new Date().toLocaleDateString()}
`
  }

  function generateLabOrderText() {
    return `LABORATORY TEST REQUEST - DERMATOLOGY

Patient: ${props.patientData.firstName} ${props.patientData.lastName}
Date: ${new Date().toLocaleDateString()}

TESTS REQUESTED:
${biologyTests.map((test, i) => `
${i + 1}. ${test.nom}
   Category: ${test.categorie}
   Urgent: ${test.urgence ? 'Yes' : 'No'}
   Fasting: ${test.aJeun ? 'Yes' : 'No'}
   Clinical Indication: ${test.motifClinique}
`).join('\n')}

Physician Signature: ________________
Date: ${new Date().toLocaleDateString()}
`
  }

  function generateImagingOrderText() {
    return `IMAGING REQUEST - DERMATOLOGY

Patient: ${props.patientData.firstName} ${props.patientData.lastName}
Date: ${new Date().toLocaleDateString()}

IMAGING STUDIES:
${imagingExams.map((exam, i) => `
${i + 1}. ${exam.type} - ${exam.region}
   Clinical Indication: ${exam.indicationClinique}
   Urgent: ${exam.urgence ? 'Yes' : 'No'}
`).join('\n')}

Physician Signature: ________________
Date: ${new Date().toLocaleDateString()}
`
  }

  function generateSickLeaveText() {
    return `SICK LEAVE CERTIFICATE - DERMATOLOGY

Patient: ${props.patientData.firstName} ${props.patientData.lastName}
Date: ${new Date().toLocaleDateString()}

SICK LEAVE DETAILS:
Start Date: ${sickLeaveData.startDate}
End Date: ${sickLeaveData.endDate}
Number of Days: ${sickLeaveData.numberOfDays}

Medical Reason: ${sickLeaveData.medicalReason}

Work Restrictions: ${sickLeaveData.workRestrictions}

Remarks: ${sickLeaveData.remarks}

Physician Signature: ________________
Date: ${new Date().toLocaleDateString()}
`
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
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="consultation">
                <FileText className="h-4 w-4 mr-2" />
                Compte Rendu
              </TabsTrigger>
              <TabsTrigger value="medicaments">
                <Pill className="h-4 w-4 mr-2" />
                Ordonnance
              </TabsTrigger>
              <TabsTrigger value="biologie">
                <TestTube className="h-4 w-4 mr-2" />
                Examens Labo
              </TabsTrigger>
              <TabsTrigger value="imagerie">
                <Scan className="h-4 w-4 mr-2" />
                Paraclinique
              </TabsTrigger>
              <TabsTrigger value="sickleave">
                <Calendar className="h-4 w-4 mr-2" />
                Arrêt Travail
              </TabsTrigger>
            </TabsList>

            {/* Consultation Report Tab */}
            <TabsContent value="consultation" className="space-y-4 mt-6">
              <div className="space-y-4">
                <Textarea 
                  value={consultationReport} 
                  onChange={(e) => setConsultationReport(e.target.value)} 
                  className="min-h-[600px] font-mono text-sm"
                  placeholder="Consultation report will be generated here..."
                />
                <Button onClick={downloadConsultationReport} className="bg-gradient-to-r from-teal-600 to-cyan-600">
                  <Download className="h-4 w-4 mr-2" />
                  Download Consultation Report
                </Button>
              </div>
            </TabsContent>

            {/* Medications Tab */}
            <TabsContent value="medicaments" className="space-y-4 mt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Dermatology Medications</h3>
                <Button onClick={addMedication} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Medication
                </Button>
              </div>

              {medications.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-gray-500">
                    No medications added yet. Click "Add Medication" to start.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {medications.map((med, index) => (
                    <Card key={index} className="border-teal-200">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <Badge variant="outline">Medication {index + 1}</Badge>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => removeMedication(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Medication Name</Label>
                            <Input 
                              value={med.nom} 
                              onChange={(e) => updateMedication(index, 'nom', e.target.value)}
                              placeholder="e.g., Hydrocortisone Cream"
                            />
                          </div>
                          <div>
                            <Label>Generic Name</Label>
                            <Input 
                              value={med.denominationCommune} 
                              onChange={(e) => updateMedication(index, 'denominationCommune', e.target.value)}
                              placeholder="e.g., Hydrocortisone"
                            />
                          </div>
                          <div>
                            <Label>Dosage</Label>
                            <Input 
                              value={med.dosage} 
                              onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                              placeholder="e.g., 1%"
                            />
                          </div>
                          <div>
                            <Label>Form</Label>
                            <Select value={med.forme} onValueChange={(value) => updateMedication(index, 'forme', value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cream">Cream</SelectItem>
                                <SelectItem value="ointment">Ointment</SelectItem>
                                <SelectItem value="lotion">Lotion</SelectItem>
                                <SelectItem value="gel">Gel</SelectItem>
                                <SelectItem value="tablet">Tablet</SelectItem>
                                <SelectItem value="capsule">Capsule</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Frequency</Label>
                            <Input 
                              value={med.posologie} 
                              onChange={(e) => updateMedication(index, 'posologie', e.target.value)}
                              placeholder="e.g., Apply twice daily"
                            />
                          </div>
                          <div>
                            <Label>Route</Label>
                            <Select value={med.modeAdministration} onValueChange={(value) => updateMedication(index, 'modeAdministration', value)}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Topical route">Topical</SelectItem>
                                <SelectItem value="Oral route">Oral</SelectItem>
                                <SelectItem value="Parenteral route">Parenteral</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Duration</Label>
                            <Input 
                              value={med.dureeTraitement} 
                              onChange={(e) => updateMedication(index, 'dureeTraitement', e.target.value)}
                              placeholder="e.g., 14 days"
                            />
                          </div>
                          <div>
                            <Label>Quantity</Label>
                            <Input 
                              value={med.quantite} 
                              onChange={(e) => updateMedication(index, 'quantite', e.target.value)}
                              placeholder="e.g., 1 tube"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Special Instructions</Label>
                            <Input 
                              value={med.instructions} 
                              onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                              placeholder="e.g., Apply to affected areas only, avoid sun exposure"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {medications.length > 0 && (
                <Button onClick={downloadPrescription} className="bg-gradient-to-r from-teal-600 to-cyan-600">
                  <Download className="h-4 w-4 mr-2" />
                  Download Prescription
                </Button>
              )}
            </TabsContent>

            {/* Biology Tests Tab */}
            <TabsContent value="biologie" className="space-y-4 mt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Laboratory Tests</h3>
                <Button onClick={addBiologyTest} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Test
                </Button>
              </div>

              {biologyTests.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-gray-500">
                    No laboratory tests ordered yet. Click "Add Test" to start.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {biologyTests.map((test, index) => (
                    <Card key={index} className="border-teal-200">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <Badge variant="outline">Test {index + 1}</Badge>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => removeBiologyTest(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Test Name</Label>
                            <Input 
                              value={test.nom} 
                              onChange={(e) => updateBiologyTest(index, 'nom', e.target.value)}
                              placeholder="e.g., Complete Blood Count"
                            />
                          </div>
                          <div>
                            <Label>Clinical Indication</Label>
                            <Input 
                              value={test.motifClinique} 
                              onChange={(e) => updateBiologyTest(index, 'motifClinique', e.target.value)}
                              placeholder="e.g., Rule out infection"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={test.urgence} 
                              onCheckedChange={(checked) => updateBiologyTest(index, 'urgence', checked)}
                            />
                            <Label>Urgent</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={test.aJeun} 
                              onCheckedChange={(checked) => updateBiologyTest(index, 'aJeun', checked)}
                            />
                            <Label>Fasting Required</Label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {biologyTests.length > 0 && (
                <Button onClick={downloadLabOrder} className="bg-gradient-to-r from-teal-600 to-cyan-600">
                  <Download className="h-4 w-4 mr-2" />
                  Download Lab Order
                </Button>
              )}
            </TabsContent>

            {/* Imaging Exams Tab */}
            <TabsContent value="imagerie" className="space-y-4 mt-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Imaging Studies</h3>
                <Button onClick={addImagingExam} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Imaging
                </Button>
              </div>

              {imagingExams.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center text-gray-500">
                    No imaging studies ordered yet. Click "Add Imaging" to start.
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {imagingExams.map((exam, index) => (
                    <Card key={index} className="border-teal-200">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <Badge variant="outline">Imaging {index + 1}</Badge>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            onClick={() => removeImagingExam(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Imaging Type</Label>
                            <Select value={exam.type} onValueChange={(value) => updateImagingExam(index, 'type', value)}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="X-Ray">X-Ray</SelectItem>
                                <SelectItem value="CT Scan">CT Scan</SelectItem>
                                <SelectItem value="MRI">MRI</SelectItem>
                                <SelectItem value="Ultrasound">Ultrasound</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Region</Label>
                            <Input 
                              value={exam.region} 
                              onChange={(e) => updateImagingExam(index, 'region', e.target.value)}
                              placeholder="e.g., Chest, Abdomen"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Clinical Indication</Label>
                            <Input 
                              value={exam.indicationClinique} 
                              onChange={(e) => updateImagingExam(index, 'indicationClinique', e.target.value)}
                              placeholder="e.g., Rule out deep tissue involvement"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch 
                              checked={exam.urgence} 
                              onCheckedChange={(checked) => updateImagingExam(index, 'urgence', checked)}
                            />
                            <Label>Urgent</Label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {imagingExams.length > 0 && (
                <Button onClick={downloadImagingOrder} className="bg-gradient-to-r from-teal-600 to-cyan-600">
                  <Download className="h-4 w-4 mr-2" />
                  Download Imaging Order
                </Button>
              )}
            </TabsContent>

            {/* Sick Leave Tab */}
            <TabsContent value="sickleave" className="space-y-4 mt-6">
              <h3 className="text-lg font-semibold">Sick Leave Certificate</h3>
              
              <Card className="border-teal-200">
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date</Label>
                      <Input 
                        type="date"
                        value={sickLeaveData.startDate}
                        onChange={(e) => setSickLeaveData(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input 
                        type="date"
                        value={sickLeaveData.endDate}
                        onChange={(e) => {
                          const newEndDate = e.target.value
                          setSickLeaveData(prev => {
                            const days = prev.startDate && newEndDate 
                              ? Math.ceil((new Date(newEndDate).getTime() - new Date(prev.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1
                              : 0
                            return { ...prev, endDate: newEndDate, numberOfDays: days }
                          })
                        }}
                      />
                    </div>
                    <div>
                      <Label>Number of Days</Label>
                      <Input 
                        type="number"
                        value={sickLeaveData.numberOfDays}
                        onChange={(e) => setSickLeaveData(prev => ({ ...prev, numberOfDays: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div>
                      <Label>Medical Reason</Label>
                      <Input 
                        value={sickLeaveData.medicalReason}
                        onChange={(e) => setSickLeaveData(prev => ({ ...prev, medicalReason: e.target.value }))}
                        placeholder="e.g., Severe dermatological condition requiring rest"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Work Restrictions</Label>
                      <Textarea 
                        value={sickLeaveData.workRestrictions}
                        onChange={(e) => setSickLeaveData(prev => ({ ...prev, workRestrictions: e.target.value }))}
                        placeholder="e.g., Avoid sun exposure, avoid physical strain"
                        rows={2}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Additional Remarks</Label>
                      <Textarea 
                        value={sickLeaveData.remarks}
                        onChange={(e) => setSickLeaveData(prev => ({ ...prev, remarks: e.target.value }))}
                        placeholder="Any additional notes"
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button 
                onClick={downloadSickLeave} 
                className="bg-gradient-to-r from-teal-600 to-cyan-600"
                disabled={!sickLeaveData.startDate || !sickLeaveData.endDate}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Sick Leave Certificate
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Complete Button */}
      <Card className="border-teal-200 bg-teal-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-teal-600" />
              <div>
                <p className="font-semibold text-teal-900">Ready to Complete Consultation</p>
                <p className="text-sm text-teal-700">Review all sections before completing.</p>
              </div>
            </div>
            <Button 
              onClick={props.onComplete} 
              className="bg-gradient-to-r from-teal-600 to-cyan-600"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Complete Consultation
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
