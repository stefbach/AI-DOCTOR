"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { User, Stethoscope, Brain, FileText, Settings } from "lucide-react"

import PatientForm from "@/components/patient-form"
import ClinicalForm from "@/components/clinical-form"
import QuestionsForm from "@/components/questions-form"
import DiagnosisForm from "@/components/diagnosis-form"
import TestCases from "@/components/test-cases"
import SystemCheck from "@/components/system-check"

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
  primaryDiagnosis: string
  differentialDiagnoses: string[]
  recommendations: string[]
  urgencyLevel: string
  followUp: string
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
  primaryDiagnosis: "",
  differentialDiagnoses: [],
  recommendations: [],
  urgencyLevel: "",
  followUp: "",
}

export default function MedicalAIExpert() {
  const [currentStep, setCurrentStep] = useState(0)
  const [patientData, setPatientData] = useState<PatientData>(defaultPatientData)
  const [clinicalData, setClinicalData] = useState<ClinicalData>(defaultClinicalData)
  const [questionsData, setQuestionsData] = useState<QuestionsData>(defaultQuestionsData)
  const [diagnosisData, setDiagnosisData] = useState<DiagnosisData>(defaultDiagnosisData)

  const steps = [
    {
      id: 0,
      title: "Informations Patient",
      icon: <User className="h-5 w-5" />,
      description: "Données démographiques et antécédents",
    },
    {
      id: 1,
      title: "Examen Clinique",
      icon: <Stethoscope className="h-5 w-5" />,
      description: "Symptômes et signes vitaux",
    },
    {
      id: 2,
      title: "Questions IA",
      icon: <Brain className="h-5 w-5" />,
      description: "Questions personnalisées générées par IA",
    },
    {
      id: 3,
      title: "Diagnostic",
      icon: <FileText className="h-5 w-5" />,
      description: "Diagnostic et recommandations",
    },
  ]

  const getProgress = () => {
    return ((currentStep + 1) / steps.length) * 100
  }

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (step: number) => {
    setCurrentStep(step)
  }

  const resetForm = () => {
    setCurrentStep(0)
    setPatientData(defaultPatientData)
    setClinicalData(defaultClinicalData)
    setQuestionsData(defaultQuestionsData)
    setDiagnosisData(defaultDiagnosisData)
  }

  const allData = {
    patient: patientData,
    clinical: clinicalData,
    questions: questionsData,
    diagnosis: diagnosisData,
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Expert Médical IA</h1>
          <p className="text-gray-600">Système d'aide au diagnostic médical avec intelligence artificielle</p>
        </div>

        <Tabs defaultValue="consultation" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="consultation">Consultation</TabsTrigger>
            <TabsTrigger value="tests">Tests IA</TabsTrigger>
            <TabsTrigger value="system">Système</TabsTrigger>
            <TabsTrigger value="settings">Paramètres</TabsTrigger>
          </TabsList>

          <TabsContent value="consultation" className="space-y-6">
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
                <div className="flex justify-between items-center">
                  {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center">
                      <Button
                        variant={currentStep === index ? "default" : currentStep > index ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => goToStep(index)}
                        className="flex items-center space-x-2"
                        disabled={index > currentStep + 1}
                      >
                        {step.icon}
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
                  allData={allData}
                  onDataChange={setDiagnosisData}
                  onNext={nextStep}
                  onPrevious={previousStep}
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="tests" className="space-y-6">
            <TestCases />
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <SystemCheck />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Paramètres du Système
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Configuration IA</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div>Modèle: GPT-4o</div>
                          <div>Température: 0.3</div>
                          <div>Max Tokens: 2000</div>
                          <div>Questions par défaut: 8</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">APIs Externes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div>OpenAI: ✅ Configuré</div>
                          <div>FDA Drug Info: ✅ Actif</div>
                          <div>RxNorm: ✅ Actif</div>
                          <div>PubMed: ✅ Actif</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Statistiques d'Utilisation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-blue-600">0</div>
                          <div className="text-xs text-gray-600">Consultations</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">0</div>
                          <div className="text-xs text-gray-600">Questions IA</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-purple-600">0</div>
                          <div className="text-xs text-gray-600">Diagnostics</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-orange-600">0</div>
                          <div className="text-xs text-gray-600">Tests</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
