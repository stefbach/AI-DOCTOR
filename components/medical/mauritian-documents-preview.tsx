// components/medical/mauritian-documents-preview.tsx
"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Eye, 
  Download, 
  Print, 
  FileText, 
  TestTube, 
  Stethoscope, 
  Pill,
  ArrowLeft,
  CheckCircle,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  AlertTriangle
} from "lucide-react"

interface MauritianDocumentsPreviewProps {
  documents: any
  onBack?: () => void
  onDownload?: (docType: string) => void
  onPrint?: (docType: string) => void
}

export default function MauritianDocumentsPreview({ 
  documents, 
  onBack, 
  onDownload, 
  onPrint 
}: MauritianDocumentsPreviewProps) {
  const [activeTab, setActiveTab] = useState("consultation")

  if (!documents) {
    return (
      <Card className="bg-red-50 border border-red-200">
        <CardContent className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-700 font-semibold">Aucun document disponible</p>
          <Button onClick={onBack} variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </CardContent>
      </Card>
    )
  }

  const formatDocument = (content: any): string => {
    if (typeof content === 'string') return content
    return JSON.stringify(content, null, 2)
  }

  const renderConsultationDocument = () => {
    const doc = documents.consultation
    if (!doc) return <p>Document non disponible</p>

    return (
      <div className="space-y-6">
        {/* En-tête */}
        <div className="text-center border-b pb-4">
          <h2 className="text-2xl font-bold text-blue-800">
            {doc.header?.title || "COMPTE-RENDU DE CONSULTATION"}
          </h2>
          <div className="mt-4 text-sm text-gray-600">
            <p><strong>{doc.header?.doctorName || "Dr. MÉDECIN"}</strong></p>
            <p>{doc.header?.specialty || "Médecine générale"}</p>
            <p>{doc.header?.address || "Cabinet médical"}</p>
            <p>{doc.header?.phone || "+230 xxx xxxx"} | {doc.header?.email || "contact@cabinet.mu"}</p>
            <p className="mt-2">N° Conseil: {doc.header?.registrationNumber || "MCM-XXXXX"}</p>
          </div>
        </div>

        {/* Informations patient */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <User className="h-5 w-5" />
            Informations Patient
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <p><strong>Nom:</strong> {doc.patient?.firstName} {doc.patient?.lastName}</p>
            <p><strong>Âge:</strong> {doc.patient?.age}</p>
            <p><strong>Adresse:</strong> {doc.patient?.address || "Non renseignée"}</p>
            <p><strong>Allergies:</strong> {doc.patient?.allergies || "Aucune"}</p>
          </div>
        </div>

        {/* Sections médicales */}
        {doc.anamnesis && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">ANAMNÈSE</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{doc.anamnesis}</p>
          </div>
        )}

        {doc.physicalExam && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">EXAMEN PHYSIQUE</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{doc.physicalExam}</p>
          </div>
        )}

        {doc.diagnosticAssessment && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">ÉVALUATION DIAGNOSTIQUE</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{doc.diagnosticAssessment}</p>
          </div>
        )}

        {doc.therapeuticPlan && (
          <div>
            <h3 className="font-semibold text-gray-800 mb-2">PLAN THÉRAPEUTIQUE</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{doc.therapeuticPlan}</p>
          </div>
        )}

        {/* Signature */}
        <div className="mt-8 pt-4 border-t text-center text-sm text-gray-600">
          <p>{doc.header?.doctorName}</p>
          <p>Date: {doc.header?.date || new Date().toLocaleDateString('fr-FR')}</p>
        </div>
      </div>
    )
  }

  const renderBiologyDocument = () => {
    const doc = documents.biology
    if (!doc) return <p>Document non disponible</p>

    return (
      <div className="space-y-6">
        {/* En-tête */}
        <div className="text-center border-b pb-4">
          <h2 className="text-2xl font-bold text-red-800">
            {doc.header?.title || "ORDONNANCE D'EXAMENS BIOLOGIQUES"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {doc.header?.physician} - N° {doc.header?.registration}
          </p>
        </div>

        {/* Patient */}
        <div className="bg-red-50 p-4 rounded-lg">
          <p><strong>Patient:</strong> {doc.patient?.firstName} {doc.patient?.lastName}</p>
          <p><strong>Âge:</strong> {doc.patient?.age}</p>
        </div>

        {/* Prescriptions */}
        <div>
          <h3 className="font-semibold text-red-800 mb-4">Examens prescrits:</h3>
          {doc.prescriptions?.map((prescription: any, index: number) => (
            <div key={index} className="mb-4 p-4 border rounded-lg bg-white">
              <h4 className="font-semibold text-red-700">
                {index + 1}. {prescription.exam}
              </h4>
              <div className="mt-2 text-sm text-gray-600 space-y-1">
                <p><strong>Indication:</strong> {prescription.indication}</p>
                <p><strong>Urgence:</strong> {prescription.urgency}</p>
                <p><strong>Jeûne:</strong> {prescription.fasting}</p>
                {prescription.mauritianAvailability && (
                  <p><strong>Disponibilité:</strong> {prescription.mauritianAvailability}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Signature */}
        <div className="mt-8 pt-4 border-t text-center text-sm text-gray-600">
          <p>{doc.header?.physician}</p>
          <p>Date: {doc.header?.date}</p>
        </div>
      </div>
    )
  }

  const renderParaclinicalDocument = () => {
    const doc = documents.paraclinical
    if (!doc) return <p>Document non disponible</p>

    return (
      <div className="space-y-6">
        {/* En-tête */}
        <div className="text-center border-b pb-4">
          <h2 className="text-2xl font-bold text-green-800">
            {doc.header?.title || "ORDONNANCE D'EXAMENS PARACLINIQUES"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {doc.header?.physician} - N° {doc.header?.registration}
          </p>
        </div>

        {/* Patient */}
        <div className="bg-green-50 p-4 rounded-lg">
          <p><strong>Patient:</strong> {doc.patient?.firstName} {doc.patient?.lastName}</p>
          <p><strong>Âge:</strong> {doc.patient?.age}</p>
        </div>

        {/* Prescriptions */}
        <div>
          <h3 className="font-semibold text-green-800 mb-4">Examens prescrits:</h3>
          {doc.prescriptions?.map((prescription: any, index: number) => (
            <div key={index} className="mb-4 p-4 border rounded-lg bg-white">
              <h4 className="font-semibold text-green-700">
                {index + 1}. {prescription.exam}
              </h4>
              <div className="mt-2 text-sm text-gray-600 space-y-1">
                <p><strong>Catégorie:</strong> {prescription.category}</p>
                <p><strong>Indication:</strong> {prescription.indication}</p>
                <p><strong>Urgence:</strong> {prescription.urgency}</p>
                <p><strong>Préparation:</strong> {prescription.preparation}</p>
                {prescription.mauritianAvailability && (
                  <p><strong>Centres disponibles:</strong> {prescription.mauritianAvailability}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Signature */}
        <div className="mt-8 pt-4 border-t text-center text-sm text-gray-600">
          <p>{doc.header?.physician}</p>
          <p>Date: {doc.header?.date}</p>
        </div>
      </div>
    )
  }

  const renderMedicationDocument = () => {
    const doc = documents.medication
    if (!doc) return <p>Document non disponible</p>

    return (
      <div className="space-y-6">
        {/* En-tête */}
        <div className="text-center border-b pb-4">
          <h2 className="text-2xl font-bold text-purple-800">
            {doc.header?.title || "ORDONNANCE MÉDICAMENTEUSE"}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {doc.header?.physician} - N° {doc.header?.registration}
          </p>
        </div>

        {/* Patient avec allergies en évidence */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <p><strong>Patient:</strong> {doc.patient?.firstName} {doc.patient?.lastName}</p>
          <p><strong>Âge:</strong> {doc.patient?.age}</p>
          <div className="mt-2 p-2 bg-red-100 rounded border border-red-300">
            <p className="text-red-800 font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Allergies: {doc.patient?.allergies || "Aucune"}
            </p>
          </div>
        </div>

        {/* Prescriptions */}
        <div>
          <h3 className="font-semibold text-purple-800 mb-4">Médicaments prescrits:</h3>
          {doc.prescriptions?.map((prescription: any, index: number) => (
            <div key={index} className="mb-4 p-4 border rounded-lg bg-white">
              <h4 className="font-semibold text-purple-700">
                {index + 1}. {prescription.dci} ({prescription.class})
              </h4>
              <div className="mt-2 text-sm text-gray-600 space-y-1">
                <p><strong>Marque(s):</strong> {prescription.brand}</p>
                <p><strong>Dosage:</strong> {prescription.dosage}</p>
                <p><strong>Fréquence:</strong> {prescription.frequency}</p>
                <p><strong>Durée:</strong> {prescription.duration}</p>
                <p><strong>Quantité:</strong> {prescription.totalQuantity}</p>
                <p><strong>Indication:</strong> {prescription.indication}</p>
                <p><strong>Voie:</strong> {prescription.administration}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Conseils cliniques */}
        {doc.clinicalAdvice && (
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-800 mb-3">Conseils et surveillance:</h3>
            <div className="text-sm text-gray-700 space-y-2">
              <p>• {doc.clinicalAdvice.hydration}</p>
              <p>• {doc.clinicalAdvice.activity}</p>
              <p>• {doc.clinicalAdvice.followUp}</p>
              {doc.clinicalAdvice.emergency && (
                <p className="text-red-600 font-semibold">• {doc.clinicalAdvice.emergency}</p>
              )}
            </div>
          </div>
        )}

        {/* Signature */}
        <div className="mt-8 pt-4 border-t text-center text-sm text-gray-600">
          <p>{doc.header?.physician}</p>
          <p>{doc.header?.validity}</p>
          <p>Date: {doc.header?.date}</p>
        </div>
      </div>
    )
  }

  const handlePrintDocument = (docType: string) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    let content = ''
    let title = ''

    switch (docType) {
      case 'consultation':
        title = 'Compte-rendu de Consultation'
        const consultDiv = document.createElement('div')
        consultDiv.innerHTML = document.getElementById('consultation-content')?.innerHTML || ''
        content = consultDiv.innerHTML
        break
      case 'biology':
        title = 'Ordonnance Examens Biologiques'
        content = document.getElementById('biology-content')?.innerHTML || ''
        break
      case 'paraclinical':
        title = 'Ordonnance Examens Paracliniques'
        content = document.getElementById('paraclinical-content')?.innerHTML || ''
        break
      case 'medication':
        title = 'Ordonnance Médicamenteuse'
        content = document.getElementById('medication-content')?.innerHTML || ''
        break
      case 'all':
        title = 'Dossier Médical Complet'
        content = `
          <h1>Dossier Médical Complet</h1>
          <div style="page-break-after: always;">
            ${document.getElementById('consultation-content')?.innerHTML || ''}
          </div>
          <div style="page-break-after: always;">
            ${document.getElementById('biology-content')?.innerHTML || ''}
          </div>
          <div style="page-break-after: always;">
            ${document.getElementById('paraclinical-content')?.innerHTML || ''}
          </div>
          <div>
            ${document.getElementById('medication-content')?.innerHTML || ''}
          </div>
        `
        break
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            margin: 2cm;
            color: #333;
          }
          h1, h2, h3 { color: #2563eb; }
          .header { text-align: center; margin-bottom: 2em; }
          .section { margin-bottom: 1.5em; }
          .patient-info { 
            background: #f3f4f6; 
            padding: 1em; 
            border-radius: 8px;
            margin-bottom: 1.5em;
          }
          .prescription-item {
            border: 1px solid #e5e7eb;
            padding: 1em;
            margin-bottom: 1em;
            border-radius: 8px;
          }
          .signature { 
            margin-top: 3em; 
            text-align: center; 
            border-top: 1px solid #e5e7eb;
            padding-top: 1em;
          }
          @media print {
            body { margin: 1cm; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        ${content}
      </body>
      </html>
    `)
    
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
    }, 250)

    if (onPrint) onPrint(docType)
  }

  const handleDownloadDocument = (docType: string) => {
    let content = ''
    let filename = ''

    const generateTextContent = (doc: any, type: string) => {
      let text = ''
      
      switch (type) {
        case 'consultation':
          text = `COMPTE-RENDU DE CONSULTATION\n`
          text += `${'='.repeat(50)}\n\n`
          text += `Médecin: ${doc.header?.doctorName}\n`
          text += `Date: ${doc.header?.date}\n\n`
          text += `PATIENT\n`
          text += `Nom: ${doc.patient?.firstName} ${doc.patient?.lastName}\n`
          text += `Âge: ${doc.patient?.age}\n\n`
          if (doc.anamnesis) text += `ANAMNÈSE\n${doc.anamnesis}\n\n`
          if (doc.physicalExam) text += `EXAMEN PHYSIQUE\n${doc.physicalExam}\n\n`
          if (doc.diagnosticAssessment) text += `DIAGNOSTIC\n${doc.diagnosticAssessment}\n\n`
          if (doc.therapeuticPlan) text += `PLAN THÉRAPEUTIQUE\n${doc.therapeuticPlan}\n\n`
          break
          
        case 'biology':
          text = `ORDONNANCE D'EXAMENS BIOLOGIQUES\n`
          text += `${'='.repeat(50)}\n\n`
          text += `Patient: ${doc.patient?.firstName} ${doc.patient?.lastName}\n\n`
          doc.prescriptions?.forEach((p: any, i: number) => {
            text += `${i + 1}. ${p.exam}\n`
            text += `   Indication: ${p.indication}\n`
            text += `   Urgence: ${p.urgency}\n\n`
          })
          break
          
        case 'medication':
          text = `ORDONNANCE MÉDICAMENTEUSE\n`
          text += `${'='.repeat(50)}\n\n`
          text += `Patient: ${doc.patient?.firstName} ${doc.patient?.lastName}\n`
          text += `Allergies: ${doc.patient?.allergies}\n\n`
          doc.prescriptions?.forEach((p: any, i: number) => {
            text += `${i + 1}. ${p.dci}\n`
            text += `   Dosage: ${p.dosage}\n`
            text += `   Fréquence: ${p.frequency}\n`
            text += `   Durée: ${p.duration}\n\n`
          })
          break
      }
      
      return text
    }

    switch (docType) {
      case 'consultation':
        content = generateTextContent(documents.consultation, 'consultation')
        filename = 'compte-rendu-consultation.txt'
        break
      case 'biology':
        content = generateTextContent(documents.biology, 'biology')
        filename = 'ordonnance-biologie.txt'
        break
      case 'paraclinical':
        content = generateTextContent(documents.paraclinical, 'paraclinical')
        filename = 'ordonnance-paraclinique.txt'
        break
      case 'medication':
        content = generateTextContent(documents.medication, 'medication')
        filename = 'ordonnance-medicaments.txt'
        break
      case 'all':
        content = 'DOSSIER MÉDICAL COMPLET\n' + '='.repeat(50) + '\n\n'
        content += generateTextContent(documents.consultation, 'consultation')
        content += '\n\n' + '='.repeat(50) + '\n\n'
        content += generateTextContent(documents.biology, 'biology')
        content += '\n\n' + '='.repeat(50) + '\n\n'
        content += generateTextContent(documents.paraclinical, 'paraclinical')
        content += '\n\n' + '='.repeat(50) + '\n\n'
        content += generateTextContent(documents.medication, 'medication')
        filename = 'dossier-medical-complet.txt'
        break
    }

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    if (onDownload) onDownload(docType)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white/90 backdrop-blur-sm shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-t-lg">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="h-6 w-6" />
              Aperçu des Documents Médicaux
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePrintDocument('all')}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                <Print className="h-4 w-4 mr-2" />
                Tout imprimer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadDocument('all')}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                <Download className="h-4 w-4 mr-2" />
                Tout télécharger
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Tabs for documents */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="consultation" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Consultation
          </TabsTrigger>
          <TabsTrigger value="biology" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Biologie
          </TabsTrigger>
          <TabsTrigger value="paraclinical" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Paraclinique
          </TabsTrigger>
          <TabsTrigger value="medication" className="flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Médicaments
          </TabsTrigger>
        </TabsList>

        {/* Consultation Tab */}
        <TabsContent value="consultation">
          <Card className="bg-white shadow-xl">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Compte-rendu de Consultation
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrintDocument('consultation')}
                    className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  >
                    <Print className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadDocument('consultation')}
                    className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ScrollArea className="h-[600px]">
                <div id="consultation-content" className="pr-4">
                  {renderConsultationDocument()}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Biology Tab */}
        <TabsContent value="biology">
          <Card className="bg-white shadow-xl">
            <CardHeader className="bg-gradient-to-r from-red-500 to-red-600 text-white">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Ordonnance Examens Biologiques
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrintDocument('biology')}
                    className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  >
                    <Print className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadDocument('biology')}
                    className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ScrollArea className="h-[600px]">
                <div id="biology-content" className="pr-4">
                  {renderBiologyDocument()}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paraclinical Tab */}
        <TabsContent value="paraclinical">
          <Card className="bg-white shadow-xl">
            <CardHeader className="bg-gradient-to-r from-green-500 to-green-600 text-white">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5" />
                  Ordonnance Examens Paracliniques
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrintDocument('paraclinical')}
                    className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  >
                    <Print className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadDocument('paraclinical')}
                    className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ScrollArea className="h-[600px]">
                <div id="paraclinical-content" className="pr-4">
                  {renderParaclinicalDocument()}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Medication Tab */}
        <TabsContent value="medication">
          <Card className="bg-white shadow-xl">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pill className="h-5 w-5" />
                  Ordonnance Médicamenteuse
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePrintDocument('medication')}
                    className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  >
                    <Print className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadDocument('medication')}
                    className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <ScrollArea className="h-[600px]">
                <div id="medication-content" className="pr-4">
                  {renderMedicationDocument()}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <Button 
          variant="outline" 
          onClick={onBack}
          className="px-6 py-3"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour à l'édition
        </Button>

        <div className="flex items-center gap-4">
          <Badge className="bg-green-100 text-green-800 border border-green-300">
            <CheckCircle className="h-4 w-4 mr-1" />
            4 documents prêts
          </Badge>
          
          <Button 
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3"
            onClick={() => handleDownloadDocument('all')}
          >
            <Download className="h-4 w-4 mr-2" />
            Télécharger le dossier complet
          </Button>
        </div>
      </div>
    </div>
  )
}
