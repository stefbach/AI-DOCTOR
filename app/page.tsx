"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  User,
  Stethoscope,
  Brain,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  TestTube,
  Pill,
  ClipboardList,
} from "lucide-react"

import PatientForm from "@/components/patient-form"
import ClinicalForm from "@/components/clinical-form"
import QuestionsForm from "@/components/questions-form"
import DiagnosisForm from "@/components/diagnosis-form"
import ParaclinicalExams from "@/components/paraclinical-exams"
import MedicationPrescription from "@/components/medication-prescription"
import ConsultationReport from "@/components/consultation-report"

interface PatientData {
  firstName: string
  lastName: string
  dateOfBirth: string
  age: number
  gender: string
  weight: number
  height: number
  bloodType: string
  allergies: string[]
  medicalHistory: string[]
  currentMedications: string[]
  insuranceInfo: {
    provider: string
    policyNumber: string
  }
  lifeHabits: {
    smoking: string
    alcohol: string
    physicalActivity: string
  }
}

interface ClinicalData {
  chiefComplaint: string
  symptoms: string[]
  symptomDuration: string
  vitalSigns: {
    temperature: string
    heartRate: string
    bloodPressureSystolic: string
    bloodPressureDiastolic: string
  }
  painScale: number
  functionalStatus: string
  notes: string
}

interface QuestionsData {
  responses: Array<{
    questionId: number
    question: string
    answer: string | number
    type: string
  }>
}

interface DiagnosisData {
  primaryDiagnosis: any
  differentialDiagnoses: any[]
  recommendedTests: string[]
  treatmentSuggestions: string[]
  followUpPlan: string
  riskFactors: string[]
  prognosisNotes: string
  aiConfidence: number
  generationStatus: "pending" | "generating" | "completed" | "error"
  data?: any
}

interface ExamsData {
  selectedExams: any[]
  prescriptions: any[]
  pubmedEvidence: any
  completedAt: string
}

interface MedicationData {
  selectedMedications: any[]
  prescriptions: any[]
  fdaData: any
  rxnormData: any
  completedAt: string
}

interface ReportData {
  header: any
  patientInfo: any
  consultation: any
  diagnosis: any
  examinations: any[]
  prescriptions: any[]
  apiData: any
  generatedAt: string
}

const defaultPatientData: PatientData = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  age: 0,
  gender: "",
  weight: 0,
  height: 0,
  bloodType: "",
  allergies: [],
  medicalHistory: [],
  currentMedications: [],
  insuranceInfo: {
    provider: "",
    policyNumber: "",
  },
  lifeHabits: {
    smoking: "",
    alcohol: "",
    physicalActivity: "",
  },
}

const defaultClinicalData: ClinicalData = {
  chiefComplaint: "",
  symptoms: [],
  symptomDuration: "",
  vitalSigns: {
    temperature: "",
    heartRate: "",
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
  },
  painScale: 0,
  functionalStatus: "",
  notes: "",
}

const defaultQuestionsData: QuestionsData = {
  responses: [],
}

const defaultDiagnosisData: DiagnosisData = {
  primaryDiagnosis: null,
  differentialDiagnoses: [],
  recommendedTests: [],
  treatmentSuggestions: [],
  followUpPlan: "",
  riskFactors: [],
  prognosisNotes: "",
  aiConfidence: 0,
  generationStatus: "pending",
  data: null,
}

const defaultExamsData: ExamsData = {
  selectedExams: [],
  prescriptions: [],
  pubmedEvidence: null,
  completedAt: "",
}

const defaultMedicationData: MedicationData = {
  selectedMedications: [],
  prescriptions: [],
  fdaData: null,
  rxnormData: null,
  completedAt: "",
}

const defaultReportData: ReportData = {
  header: {},
  patientInfo: {},
  consultation: {},
  diagnosis: {},
  examinations: [],
  prescriptions: [],
  apiData: {},
  generatedAt: "",
}

export default function TibokIADoctor() {
  const [currentStep, setCurrentStep] = useState(0)
  const [patientData, setPatientData] = useState<PatientData>(defaultPatientData)
  const [clinicalData, setClinicalData] = useState<ClinicalData>(defaultClinicalData)
  const [questionsData, setQuestionsData] = useState<QuestionsData>(defaultQuestionsData)
  const [diagnosisData, setDiagnosisData] = useState<DiagnosisData>(defaultDiagnosisData)
  const [examsData, setExamsData] = useState<ExamsData>(defaultExamsData)
  const [medicationData, setMedicationData] = useState<MedicationData>(defaultMedicationData)
  const [reportData, setReportData] = useState<ReportData>(defaultReportData)

  const steps = [
    {
      id: 0,
      title: "Informations Patient",
      icon: <User className="h-5 w-5" />,
      description: "Données démographiques et antécédents",
      required: true,
    },
    {
      id: 1,
      title: "Examen Clinique",
      icon: <Stethoscope className="h-5 w-5" />,
      description: "Symptômes et signes vitaux",
      required: true,
    },
    {
      id: 2,
      title: "Questions IA",
      icon: <Brain className="h-5 w-5" />,
      description: "Questions personnalisées générées par IA",
      required: false,
    },
    {
      id: 3,
      title: "Diagnostic IA",
      icon: <FileText className="h-5 w-5" />,
      description: "Diagnostic et recommandations",
      required: false,
    },
    {
      id: 4,
      title: "Examens Paracliniques",
      icon: <TestTube className="h-5 w-5" />,
      description: "Examens biologiques et imagerie",
      required: false,
    },
    {
      id: 5,
      title: "Prescription Médicamenteuse",
      icon: <Pill className="h-5 w-5" />,
      description: "Médicaments et posologie",
      required: false,
    },
    {
      id: 6,
      title: "Rapport de Consultation",
      icon: <ClipboardList className="h-5 w-5" />,
      description: "Rapport final complet",
      required: false,
    },
  ]

  const getProgress = () => {
    return ((currentStep + 1) / steps.length) * 100
  }

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return "completed"
    if (stepIndex === currentStep) return "current"
    return "pending"
  }

  const getStepIcon = (stepIndex: number) => {
    const status = getStepStatus(stepIndex)
    if (status === "completed") return <CheckCircle className="h-4 w-4 text-green-600" />
    if (status === "current") return <Clock className="h-4 w-4 text-blue-600" />
    return <AlertTriangle className="h-4 w-4 text-gray-400" />
  }

  const isStepValid = (stepIndex: number) => {
    switch (stepIndex) {
      case 0:
        return patientData.firstName && patientData.lastName && patientData.age > 0
      case 1:
        return clinicalData.chiefComplaint && clinicalData.symptoms.length > 0
      case 2:
        return questionsData.responses.length > 0
      case 3:
        return diagnosisData.generationStatus === "completed"
      case 4:
        return examsData.selectedExams.length > 0
      case 5:
        return medicationData.selectedMedications.length > 0
      case 6:
        return reportData.generatedAt !== ""
      default:
        return false
    }
  }

  const canProceedToStep = (stepIndex: number) => {
    if (stepIndex === 0) return true
    return isStepValid(stepIndex - 1)
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1 && isStepValid(currentStep)) {
      setCurrentStep(currentStep + 1)
    }
  }

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (step: number) => {
    if (canProceedToStep(step)) {
      setCurrentStep(step)
    }
  }

  const resetForm = () => {
    setCurrentStep(0)
    setPatientData(defaultPatientData)
    setClinicalData(defaultClinicalData)
    setQuestionsData(defaultQuestionsData)
    setDiagnosisData(defaultDiagnosisData)
    setExamsData(defaultExamsData)
    setMedicationData(defaultMedicationData)
    setReportData(defaultReportData)
  }

  const allData = {
    patientData: patientData,
    clinicalData: clinicalData,
    questionsData: questionsData,
    diagnosisData: diagnosisData,
    examsData: examsData,
    medicationData: medicationData,
    reportData: reportData,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🏥 TIBOK IA DOCTOR</h1>
          <p className="text-gray-600">Système d'aide au diagnostic médical avec intelligence artificielle</p>
        </div>

        <div className="space-y-6">
          {/* En-tête avec progression */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Consultation Médicale</CardTitle>
                <div className="flex items-center space-x-4">
                  <Badge variant="outline">
                    Étape {currentStep + 1} / {steps.length}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={resetForm}>
                    Nouvelle Consultation
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{steps[currentStep].title}</span>
                  <span>{Math.round(getProgress())}% complété</span>
                </div>
                <Progress value={getProgress()} className="w-full" />
              </div>
            </CardHeader>
          </Card>

          {/* Navigation par étapes */}
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center overflow-x-auto">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <Button
                      variant={
                        getStepStatus(index) === "current"
                          ? "default"
                          : getStepStatus(index) === "completed"
                            ? "secondary"
                            : "outline"
                      }
                      size="sm"
                      onClick={() => goToStep(index)}
                      className="flex items-center space-x-2 min-w-fit"
                      disabled={!canProceedToStep(index)}
                    >
                      {getStepIcon(index)}
                      <span className="hidden md:inline">{step.title}</span>
                    </Button>
                    {index < steps.length - 1 && <div className="w-8 h-px bg-gray-300 mx-2 hidden md:block" />}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Contenu des étapes */}
          <div className="space-y-6">
            {currentStep === 0 && (
              <PatientForm
                data={patientData}
                allData={allData}
                onDataChange={setPatientData}
                onNext={nextStep}
                onPrevious={previousStep}
              />
            )}

            {currentStep === 1 && (
              <ClinicalForm
                data={clinicalData}
                allData={allData}
                onDataChange={setClinicalData}
                onNext={nextStep}
                onPrevious={previousStep}
              />
            )}

            {currentStep === 2 && (
              <QuestionsForm
                patientData={patientData}
                clinicalData={clinicalData}
                data={questionsData}
                allData={allData}
                onDataChange={setQuestionsData}
                onNext={nextStep}
                onPrevious={previousStep}
              />
            )}

            {currentStep === 3 && (
              <DiagnosisForm
                patientData={patientData}
                clinicalData={clinicalData}
                questionsData={questionsData}
                data={diagnosisData}
                allData={allData}
                onDataChange={setDiagnosisData}
                onNext={nextStep}
                onPrevious={previousStep}
              />
            )}

            {currentStep === 4 && (
              <ParaclinicalExams
                data={examsData}
                allData={allData}
                onDataChange={setExamsData}
                onNext={nextStep}
                onPrevious={previousStep}
              />
            )}

            {currentStep === 5 && (
              <MedicationPrescription
                data={medicationData}
                allData={allData}
                onDataChange={setMedicationData}
                onNext={nextStep}
                onPrevious={previousStep}
              />
            )}

            {currentStep === 6 && (
              <ConsultationReport
                data={reportData}
                allData={allData}
                onDataChange={setReportData}
                onNext={nextStep}
                onPrevious={previousStep}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
