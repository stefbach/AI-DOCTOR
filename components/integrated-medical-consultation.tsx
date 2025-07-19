"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  FileText,
  Stethoscope,
  FlaskConical,
  Pill,
  BookOpen,
  Download,
  PrinterIcon as Print,
  CheckCircle,
} from "lucide-react"

interface WorkflowResult {
  diagnosis: string | any
  examens: string | any
  prescription: string | any
  pubmedEvidence: any
  fdaVerification: any
  consultationReport: string | any
}

interface IntegratedMedicalConsultationProps {
  patientData: any
  result: WorkflowResult
}

export default function IntegratedMedicalConsultation({ patientData, result }: IntegratedMedicalConsultationProps) {
  const [activeTab, setActiveTab] = useState("rapport")

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = () => {
    const reportContent = `
CONSULTATION MÉDICALE COMPLÈTE
==============================

PATIENT: ${patientData.firstName} ${patientData.lastName}
ÂGE: ${patientData.age} ans
DATE: ${new Date().toLocaleDateString("fr-FR")}

${extractTextFromData(result.consultationReport)}

DIAGNOSTIC DÉTAILLÉ
==================
${extractTextFromData(result.diagnosis)}

EXAMENS COMPLÉMENTAIRES
======================
${extractTextFromData(result.examens)}

PRESCRIPTION MÉDICAMENTEUSE
==========================
${extractTextFromData(result.prescription)}

RÉFÉRENCES SCIENTIFIQUES
========================
Articles PubMed consultés: ${result.pubmedEvidence?.articles?.length || 0}
Vérification FDA: ${result.fdaVerification?.success ? "Validée" : "À vérifier"}

Généré par TIBOK IA DOCTOR le ${new Date().toLocaleString("fr-FR")}
    `

    const blob = new Blob([reportContent], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `consultation-complete-${patientData.lastName}-${new Date().toISOString().split("T")[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // FONCTION UTILITAIRE : Extraire le texte de données mixtes (string ou objet)
  const extractTextFromData = (data: any): string => {
    if (typeof data === 'string') {
      return data
    }
    
    if (data && typeof data === 'object') {
      // Si c'est un objet avec un champ text
      if (data.text) {
        return data.text
      }
      
      // Si c'est un rapport de consultation structuré
      if (data.header && data.anamnesis) {
        return formatConsultationReport(data)
      }
      
      // Fallback : convertir en JSON lisible
      return JSON.stringify(data, null, 2)
    }
    
    return String(data || 'Données non disponibles')
  }

  // FONCTION CORRIGÉE : Parser le diagnostic
  const parseDiagnosis = (diagnosisData: any) => {
    try {
      console.log('Type de diagnosisData:', typeof diagnosisData)
      
      // Nouveau format JSON structuré
      if (diagnosisData && typeof diagnosisData === 'object') {
        // Format du rapport de consultation
        if (diagnosisData.diagnosticAssessment) {
          return {
            principal: diagnosisData.diagnosticAssessment.primaryDiagnosis?.condition || "Diagnostic en cours d'analyse",
            confidence: diagnosisData.diagnosticAssessment.clinicalImpression?.diagnosticConfidence || "Confiance: En évaluation",
            differentiels: diagnosisData.diagnosticAssessment.differentialDiagnosis?.alternativeDiagnoses ? 
              [diagnosisData.diagnosticAssessment.differentialDiagnosis.alternativeDiagnoses] : []
          }
        }
        
        // Format de l'orchestrateur (diagnostic IA)
        if (diagnosisData.primaryDiagnosis) {
          return {
            principal: diagnosisData.primaryDiagnosis.condition || "Diagnostic en cours d'analyse",
            confidence: `Confiance: ${diagnosisData.primaryDiagnosis.probability || diagnosisData.aiConfidence || 'En évaluation'}%`,
            differentiels: diagnosisData.differentialDiagnosis?.map((d: any) => d.condition) || []
          }
        }
        
        // Si objet avec champ text
        if (diagnosisData.text) {
          return parseDiagnosis(diagnosisData.text)
        }
        
        // Fallback pour objet non reconnu
        return {
          principal: "Diagnostic en analyse (format JSON)",
          confidence: "Confiance: Données structurées disponibles",
          differentiels: []
        }
      }
      
      // Ancien format texte
      if (typeof diagnosisData === 'string') {
        const lines = diagnosisData.split("\n").filter((line) => line.trim())
        const principal = lines.find((line) => line.includes("principal") || line.includes("probable"))
        const confidence = lines.find((line) => line.includes("%") || line.includes("confiance"))
        const differentiels = lines.filter((line) => line.includes("différentiel") || line.match(/^\d+\./))

        return {
          principal: principal || lines[0] || "Diagnostic en cours d'analyse",
          confidence: confidence || "Confiance: En évaluation",
          differentiels: differentiels.slice(0, 3),
        }
      }
      
      // Fallback sécurisé
      return {
        principal: "Diagnostic en cours d'analyse",
        confidence: "Confiance: En évaluation",
        differentiels: []
      }
      
    } catch (error) {
      console.error('Erreur parsing diagnostic:', error)
      return {
        principal: "Erreur lors de l'analyse diagnostique",
        confidence: "Confiance: Erreur de traitement",
        differentiels: []
      }
    }
  }

  // FONCTION CORRIGÉE : Parser les examens
  const parseExamens = (examensData: any) => {
    try {
      console.log('Type de examensData:', typeof examensData)
      
      // Nouveau format JSON structuré
      if (examensData && typeof examensData === 'object') {
        // Format du rapport de consultation
        if (examensData.investigationsPlan) {
          const plan = examensData.investigationsPlan
          return {
            biologie: [
              plan.laboratoryTests?.urgentTests || '',
              plan.laboratoryTests?.routineTests || '',
              plan.laboratoryTests?.specializedTests || ''
            ].filter(Boolean),
            imagerie: [
              plan.imagingStudies?.diagnosticImaging || '',
              plan.imagingStudies?.followUpImaging || ''
            ].filter(Boolean)
          }
        }
        
        // Format de l'orchestrateur
        if (examensData.urgentExams || examensData.scheduledExams || examensData.laboratoryTests) {
          const biologie = []
          const imagerie = []
          
          // Examens urgents
          if (examensData.urgentExams && Array.isArray(examensData.urgentExams)) {
            examensData.urgentExams.forEach((exam: any) => {
              const examText = exam.name || exam.exam || exam.testName || ''
              if (examText.toLowerCase().includes('biolog') || examText.toLowerCase().includes('sang')) {
                biologie.push(examText)
              } else if (examText.toLowerCase().includes('radio') || examText.toLowerCase().includes('imagerie')) {
                imagerie.push(examText)
              }
            })
          }
          
          // Examens programmés
          if (examensData.scheduledExams && Array.isArray(examensData.scheduledExams)) {
            examensData.scheduledExams.forEach((exam: any) => {
              const examText = exam.name || exam.exam || exam.testName || ''
              if (examText.toLowerCase().includes('biolog') || examText.toLowerCase().includes('sang')) {
                biologie.push(examText)
              } else if (examText.toLowerCase().includes('radio') || examText.toLowerCase().includes('imagerie')) {
                imagerie.push(examText)
              }
            })
          }
          
          // Tests de laboratoire spécifiques
          if (examensData.laboratoryTests && Array.isArray(examensData.laboratoryTests)) {
            examensData.laboratoryTests.forEach((test: any) => {
              biologie.push(test.testName || test.name || 'Test biologique')
            })
          }
          
          return { biologie, imagerie }
        }
        
        // Si objet avec champ text
        if (examensData.text) {
          return parseExamens(examensData.text)
        }
        
        // Fallback pour objet non reconnu
        return {
          biologie: ['Examens biologiques (données structurées disponibles)'],
          imagerie: ['Imagerie médicale (données structurées disponibles)']
        }
      }
      
      // Ancien format texte
      if (typeof examensData === 'string') {
        const sections = examensData.split("\n").filter((line) => line.trim())
        const biologie = sections.filter(
          (line) =>
            line.toLowerCase().includes("biolog") ||
            line.toLowerCase().includes("sang") ||
            line.toLowerCase().includes("urine"),
        )
        const imagerie = sections.filter(
          (line) =>
            line.toLowerCase().includes("radio") ||
            line.toLowerCase().includes("scanner") ||
            line.toLowerCase().includes("irm") ||
            line.toLowerCase().includes("echo"),
        )

        return { biologie, imagerie }
      }
      
      // Fallback sécurisé
      return { biologie: [], imagerie: [] }
      
    } catch (error) {
      console.error('Erreur parsing examens:', error)
      return { biologie: [], imagerie: [] }
    }
  }

  // FONCTION CORRIGÉE : Parser la prescription
  const parsePrescription = (prescriptionData: any) => {
    try {
      console.log('Type de prescriptionData:', typeof prescriptionData)
      
      // Nouveau format JSON structuré
      if (prescriptionData && typeof prescriptionData === 'object') {
        // Format du rapport de consultation
        if (prescriptionData.therapeuticPlan) {
          const plan = prescriptionData.therapeuticPlan
          const medicaments = []
          
          if (plan.pharmacotherapy?.primaryMedications) {
            medicaments.push(plan.pharmacotherapy.primaryMedications)
          }
          if (plan.immediateManagement?.urgentInterventions) {
            medicaments.push(plan.immediateManagement.urgentInterventions)
          }
          
          return medicaments.filter(Boolean)
        }
        
        // Format de l'orchestrateur
        if (prescriptionData.medications && Array.isArray(prescriptionData.medications)) {
          return prescriptionData.medications.map((med: any) => 
            `${med.dci || med.name || 'Médicament'} - ${med.posology || med.dosage || 'Posologie à définir'}`
          )
        }
        
        // Format prescription simple
        if (prescriptionData.prescription && prescriptionData.prescription.medications) {
          return prescriptionData.prescription.medications.map((med: any) =>
            `${med.dci || med.name || 'Médicament'} - ${med.posology || med.dosage || 'Posologie à définir'}`
          )
        }
        
        // Si objet avec champ text
        if (prescriptionData.text) {
          return parsePrescription(prescriptionData.text)
        }
        
        // Fallback pour objet non reconnu
        return ['Prescription médicamenteuse (données structurées disponibles)']
      }
      
      // Ancien format texte
      if (typeof prescriptionData === 'string') {
        const lines = prescriptionData.split("\n").filter((line) => line.trim())
        const medicaments = lines.filter(
          (line) => line.includes("mg") || line.includes("comprimé") || line.includes("gélule") || line.match(/^\d+\./),
        )

        return medicaments.slice(0, 5)
      }
      
      // Fallback sécurisé
      return []
      
    } catch (error) {
      console.error('Erreur parsing prescription:', error)
      return []
    }
  }

  // FONCTION UTILITAIRE : Formater un rapport de consultation structuré
  const formatConsultationReport = (reportData: any): string => {
    try {
      let formatted = ''
      
      if (reportData.header) {
        formatted += `${reportData.header.title}\n`
        formatted += `${reportData.header.subtitle}\n`
        formatted += `Date: ${reportData.header.date}\n\n`
      }
      
      if (reportData.patientIdentification) {
        formatted += `PATIENT: ${reportData.patientIdentification.administrativeData?.firstName} ${reportData.patientIdentification.administrativeData?.lastName}\n`
        formatted += `ÂGE: ${reportData.patientIdentification.administrativeData?.age}\n\n`
      }
      
      if (reportData.anamnesis) {
        formatted += `ANAMNÈSE:\n${reportData.anamnesis.chiefComplaint?.primaryComplaint || 'Non spécifié'}\n\n`
      }
      
      if (reportData.diagnosticAssessment) {
        formatted += `DIAGNOSTIC:\n${reportData.diagnosticAssessment.primaryDiagnosis?.condition || 'En cours d\'analyse'}\n\n`
      }
      
      return formatted
    } catch (error) {
      console.error('Erreur formatage rapport:', error)
      return JSON.stringify(reportData, null, 2)
    }
  }

  // Parsing des données avec les nouvelles fonctions corrigées
  const diagnosis = parseDiagnosis(result.diagnosis)
  const examens = parseExamens(result.examens)
  const medicaments = parsePrescription(result.prescription)

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Consultation Médicale Complète - {patientData.firstName} {patientData.lastName}
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Print className="h-4 w-4 mr-2" />
                Imprimer
              </Button>
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Date: {new Date().toLocaleDateString("fr-FR")}</span>
            <span>•</span>
            <span>Âge: {patientData.age} ans</span>
            <span>•</span>
            <span>Sexe: {patientData.gender}</span>
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Analyse IA Complétée
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Contenu principal avec onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="rapport" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Rapport
          </TabsTrigger>
          <TabsTrigger value="diagnostic" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Diagnostic
          </TabsTrigger>
          <TabsTrigger value="examens" className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            Examens
          </TabsTrigger>
          <TabsTrigger value="prescription" className="flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Prescription
          </TabsTrigger>
          <TabsTrigger value="evidence" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Evidence
          </TabsTrigger>
        </TabsList>

        {/* Rapport complet */}
        <TabsContent value="rapport">
          <Card>
            <CardHeader>
              <CardTitle>Compte-Rendu de Consultation</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {extractTextFromData(result.consultationReport)}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Diagnostic détaillé */}
        <TabsContent value="diagnostic">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Diagnostic Principal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-900">Diagnostic le plus probable</h4>
                    <p className="text-blue-800 mt-1">{diagnosis.principal}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium">{diagnosis.confidence}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Diagnostics Différentiels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {diagnosis.differentiels.length > 0 ? (
                    diagnosis.differentiels.map((diff, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <p className="text-sm">{diff}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">Aucun diagnostic différentiel spécifique</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Analyse Complète IA</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="whitespace-pre-wrap text-sm">
                    {extractTextFromData(result.diagnosis)}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Examens paracliniques */}
        <TabsContent value="examens">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FlaskConical className="h-5 w-5" />
                    Examens Biologiques
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {examens.biologie.length > 0 ? (
                      examens.biologie.map((exam, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                          {exam}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">Aucun examen biologique spécifique recommandé</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Imagerie Médicale
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {examens.imagerie.length > 0 ? (
                      examens.imagerie.map((exam, index) => (
                        <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                          {exam}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">Aucune imagerie spécifique recommandée</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recommandations Complètes</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="whitespace-pre-wrap text-sm">
                    {extractTextFromData(result.examens)}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Prescription */}
        <TabsContent value="prescription">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Ordonnance Médicamenteuse
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {medicaments.length > 0 ? (
                    medicaments.map((med, index) => (
                      <div key={index} className="p-3 border rounded-lg">
                        <p className="font-medium text-sm">{med}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">Aucun médicament spécifique prescrit</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vérification FDA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {result.fdaVerification?.success ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="text-green-700">Médicaments vérifiés FDA</span>
                    </>
                  ) : (
                    <>
                      <Badge variant="secondary">En cours de vérification</Badge>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Prescription Complète</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="whitespace-pre-wrap text-sm">
                    {extractTextFromData(result.prescription)}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Evidence scientifique */}
        <TabsContent value="evidence">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Références Scientifiques PubMed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">Articles trouvés: {result.pubmedEvidence?.articles?.length || 0}</Badge>
                    <Badge variant="outline">Base de données: PubMed</Badge>
                  </div>

                  {result.pubmedEvidence?.articles?.length > 0 ? (
                    <div className="space-y-2">
                      {result.pubmedEvidence.articles.slice(0, 5).map((article: any, index: number) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <h4 className="font-medium text-sm">{article.title || `Article ${index + 1}`}</h4>
                          <p className="text-xs text-gray-600 mt-1">
                            {article.authors || "Auteurs non spécifiés"} • {article.journal || "Journal non spécifié"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">Aucun article PubMed trouvé pour ce cas</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Vérifications Réglementaires</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">FDA Drug Database</span>
                    <Badge variant={result.fdaVerification?.success ? "default" : "secondary"}>
                      {result.fdaVerification?.success ? "✓ Vérifié" : "En cours"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">RxNorm Normalization</span>
                    <Badge variant="secondary">Disponible</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Drug Interactions Check</span>
                    <Badge variant="secondary">Intégré</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
