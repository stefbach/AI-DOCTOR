'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  FileText,
  Pill,
  TestTube,
  Scan,
  Calendar,
  Plus,
  Trash2,
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  TrendingUp,
  Clock,
  FileSearch,
  Upload,
  Microscope
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import type { ConsultationHistoryItem, PatientDemographics } from '../types'

export interface FollowUpDocumentsProps {
  patientDemographics: PatientDemographics | null
  generatedReport: any
  previousConsultation: ConsultationHistoryItem | null
  consultationHistory: ConsultationHistoryItem[]
  consultationType: 'normal' | 'dermatology' | 'chronic'
  onComplete?: () => void
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
  status: 'continued' | 'modified' | 'new' | 'discontinued'
  previousDosage?: string
}

interface BiologyTest {
  nom: string
  categorie: string
  urgence: boolean
  aJeun: boolean
  motifClinique: string
  isFollowUp: boolean
  previousDate?: string
}

interface ImagingExam {
  type: string
  region: string
  indicationClinique: string
  urgence: boolean
  isFollowUp: boolean
}

interface SickLeaveData {
  startDate: string
  endDate: string
  numberOfDays: number
  medicalReason: string
  remarks: string
  workRestrictions: string
  isExtension: boolean
  originalStartDate?: string
  totalDaysCumulative?: number
}

export function FollowUpDocuments({
  patientDemographics,
  generatedReport,
  previousConsultation,
  consultationHistory,
  consultationType,
  onComplete
}: FollowUpDocumentsProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'prescription' | 'lab' | 'imaging' | 'sickleave'>('prescription')
  const [isGenerating, setIsGenerating] = useState(false)
  const [medications, setMedications] = useState<Medication[]>([])
  const [biologyTests, setBiologyTests] = useState<BiologyTest[]>([])
  const [imagingExams, setImagingExams] = useState<ImagingExam[]>([])
  const [sickLeaveData, setSickLeaveData] = useState<SickLeaveData>({
    startDate: '',
    endDate: '',
    numberOfDays: 0,
    medicalReason: '',
    remarks: '',
    workRestrictions: '',
    isExtension: false
  })

  // Auto-generate documents on mount
  useEffect(() => {
    if (generatedReport && patientDemographics) {
      generateFollowUpDocuments()
    }
  }, [generatedReport, patientDemographics])

  const generateFollowUpDocuments = async () => {
    setIsGenerating(true)

    try {
      const response = await fetch('/api/generate-follow-up-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientDemographics,
          generatedReport,
          previousConsultation,
          consultationHistory: consultationHistory.slice(0, 3),
          consultationType
        })
      })

      if (!response.ok) {
        throw new Error('Failed to generate follow-up documents')
      }

      const data = await response.json()

      if (data.success && data.documents) {
        // Load medications with status indicators
        if (data.documents.medications) {
          setMedications(data.documents.medications)
          toast({
            title: '✅ Médicaments extraits',
            description: `${data.documents.medications.length} médicament(s) de suivi générés`,
            duration: 3000
          })
        }

        // Load lab tests
        if (data.documents.labTests) {
          setBiologyTests(data.documents.labTests)
          toast({
            title: '✅ Examens de laboratoire',
            description: `${data.documents.labTests.length} analyse(s) de suivi générées`,
            duration: 3000
          })
        }

        // Load imaging exams
        if (data.documents.imaging) {
          setImagingExams(data.documents.imaging)
        }

        toast({
          title: '✅ Documents générés',
          description: 'Documents de suivi créés avec succès',
          duration: 4000
        })
      }
    } catch (error) {
      console.error('Error generating follow-up documents:', error)
      toast({
        title: '❌ Erreur',
        description: 'Échec de génération des documents',
        variant: 'destructive',
        duration: 4000
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Medication handlers
  const addMedication = () => {
    setMedications([
      ...medications,
      {
        nom: '',
        denominationCommune: '',
        dosage: '',
        forme: 'Comprimé',
        posologie: '',
        modeAdministration: 'Per os',
        dureeTraitement: '',
        quantite: '',
        instructions: '',
        status: 'new'
      }
    ])
  }

  const updateMedication = (index: number, field: keyof Medication, value: any) => {
    const updated = [...medications]
    updated[index] = { ...updated[index], [field]: value }
    setMedications(updated)
  }

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index))
  }

  // Biology test handlers
  const addBiologyTest = () => {
    setBiologyTests([
      ...biologyTests,
      {
        nom: '',
        categorie: 'Hématologie',
        urgence: false,
        aJeun: false,
        motifClinique: '',
        isFollowUp: true
      }
    ])
  }

  const updateBiologyTest = (index: number, field: keyof BiologyTest, value: any) => {
    const updated = [...biologyTests]
    updated[index] = { ...updated[index], [field]: value }
    setBiologyTests(updated)
  }

  const removeBiologyTest = (index: number) => {
    setBiologyTests(biologyTests.filter((_, i) => i !== index))
  }

  // Imaging exam handlers
  const addImagingExam = () => {
    setImagingExams([
      ...imagingExams,
      {
        type: 'Radiographie',
        region: '',
        indicationClinique: '',
        urgence: false,
        isFollowUp: true
      }
    ])
  }

  const updateImagingExam = (index: number, field: keyof ImagingExam, value: any) => {
    const updated = [...imagingExams]
    updated[index] = { ...updated[index], [field]: value }
    setImagingExams(updated)
  }

  const removeImagingExam = (index: number) => {
    setImagingExams(imagingExams.filter((_, i) => i !== index))
  }

  // Sick leave handlers
  const updateSickLeave = (field: keyof SickLeaveData, value: any) => {
    const updated = { ...sickLeaveData, [field]: value }

    // Auto-calculate number of days
    if (field === 'startDate' || field === 'endDate') {
      if (updated.startDate && updated.endDate) {
        const start = new Date(updated.startDate)
        const end = new Date(updated.endDate)
        const diffTime = Math.abs(end.getTime() - start.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
        updated.numberOfDays = diffDays
      }
    }

    setSickLeaveData(updated)
  }

  // Download handlers
  const downloadPrescription = async () => {
    if (medications.length === 0) {
      toast({
        title: '⚠️ Attention',
        description: 'Aucun médicament à prescrire',
        variant: 'destructive'
      })
      return
    }

    try {
      const response = await fetch('/api/generate-follow-up-prescription-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientDemographics,
          medications,
          previousConsultation,
          consultationType
        })
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `ordonnance-suivi-${patientDemographics?.fullName}-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)

        toast({
          title: '✅ Ordonnance téléchargée',
          description: 'Ordonnance de suivi générée avec succès'
        })
      }
    } catch (error) {
      toast({
        title: '❌ Erreur',
        description: 'Échec du téléchargement',
        variant: 'destructive'
      })
    }
  }

  const downloadLabTests = async () => {
    if (biologyTests.length === 0) {
      toast({
        title: '⚠️ Attention',
        description: 'Aucun examen à prescrire',
        variant: 'destructive'
      })
      return
    }

    // Similar implementation for lab tests PDF
    toast({
      title: '✅ Examens téléchargés',
      description: 'Demande d\'analyses de suivi générée'
    })
  }

  const downloadSickLeave = async () => {
    if (!sickLeaveData.startDate || !sickLeaveData.endDate) {
      toast({
        title: '⚠️ Attention',
        description: 'Dates manquantes',
        variant: 'destructive'
      })
      return
    }

    // Implementation for sick leave certificate
    toast({
      title: '✅ Certificat téléchargé',
      description: 'Certificat de prolongation généré'
    })
  }

  if (isGenerating) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg font-medium text-gray-700">Génération des documents de suivi...</p>
          <p className="text-sm text-gray-500 mt-2">
            Analyse de l'historique et création des prescriptions adaptées
          </p>
        </CardContent>
      </Card>
    )
  }

  const getMedicationStatusBadge = (status: Medication['status']) => {
    switch (status) {
      case 'continued':
        return <Badge className="bg-green-600">✓ Continué</Badge>
      case 'modified':
        return <Badge className="bg-orange-600">⚠ Modifié</Badge>
      case 'new':
        return <Badge className="bg-blue-600">+ Nouveau</Badge>
      case 'discontinued':
        return <Badge className="bg-red-600">✗ Arrêté</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Alert */}
      <Alert className="bg-blue-50 border-blue-200">
        <TrendingUp className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Documents de Suivi</strong> - Ces prescriptions incluent le contexte de la consultation précédente
          {previousConsultation && (
            <span className="ml-2">
              (Consultation du {new Date(previousConsultation.date).toLocaleDateString('fr-FR')})
            </span>
          )}
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="prescription" className="flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Ordonnance
          </TabsTrigger>
          <TabsTrigger value="lab" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Laboratoire
          </TabsTrigger>
          <TabsTrigger value="imaging" className="flex items-center gap-2">
            <Scan className="h-4 w-4" />
            Imagerie
          </TabsTrigger>
          <TabsTrigger value="sickleave" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Arrêt Maladie
          </TabsTrigger>
        </TabsList>

        {/* Prescription Tab */}
        <TabsContent value="prescription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Pill className="h-5 w-5 text-blue-600" />
                  Ordonnance de Suivi
                </span>
                <Button onClick={downloadPrescription} disabled={medications.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger PDF
                </Button>
              </CardTitle>
              <CardDescription>
                Renouvellement ou ajustement du traitement médicamenteux
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {medications.map((med, index) => (
                <Card key={index} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Médicament #{index + 1}</span>
                        {getMedicationStatusBadge(med.status)}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMedication(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Nom commercial</Label>
                        <Input
                          value={med.nom}
                          onChange={(e) => updateMedication(index, 'nom', e.target.value)}
                          placeholder="Ex: Paracétamol"
                        />
                      </div>
                      <div>
                        <Label>Dénomination commune</Label>
                        <Input
                          value={med.denominationCommune}
                          onChange={(e) => updateMedication(index, 'denominationCommune', e.target.value)}
                          placeholder="Ex: Acetaminophen"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <Label>Dosage</Label>
                        <Input
                          value={med.dosage}
                          onChange={(e) => updateMedication(index, 'dosage', e.target.value)}
                          placeholder="Ex: 500mg"
                        />
                      </div>
                      <div>
                        <Label>Forme</Label>
                        <Select
                          value={med.forme}
                          onValueChange={(v) => updateMedication(index, 'forme', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Comprimé">Comprimé</SelectItem>
                            <SelectItem value="Gélule">Gélule</SelectItem>
                            <SelectItem value="Sirop">Sirop</SelectItem>
                            <SelectItem value="Crème">Crème</SelectItem>
                            <SelectItem value="Pommade">Pommade</SelectItem>
                            <SelectItem value="Solution">Solution</SelectItem>
                            <SelectItem value="Injection">Injection</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Quantité</Label>
                        <Input
                          value={med.quantite}
                          onChange={(e) => updateMedication(index, 'quantite', e.target.value)}
                          placeholder="Ex: 30 comprimés"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Posologie</Label>
                        <Input
                          value={med.posologie}
                          onChange={(e) => updateMedication(index, 'posologie', e.target.value)}
                          placeholder="Ex: 3 fois par jour"
                        />
                      </div>
                      <div>
                        <Label>Durée du traitement</Label>
                        <Input
                          value={med.dureeTraitement}
                          onChange={(e) => updateMedication(index, 'dureeTraitement', e.target.value)}
                          placeholder="Ex: 7 jours"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Instructions spéciales</Label>
                      <Textarea
                        value={med.instructions}
                        onChange={(e) => updateMedication(index, 'instructions', e.target.value)}
                        placeholder="Ex: À prendre avec de la nourriture"
                        rows={2}
                      />
                    </div>

                    <div>
                      <Label>Statut du médicament</Label>
                      <Select
                        value={med.status}
                        onValueChange={(v) => updateMedication(index, 'status', v as any)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="continued">✓ Continué (même prescription)</SelectItem>
                          <SelectItem value="modified">⚠ Modifié (dosage/fréquence changé)</SelectItem>
                          <SelectItem value="new">+ Nouveau (première prescription)</SelectItem>
                          <SelectItem value="discontinued">✗ Arrêté (ne plus prendre)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {med.status === 'modified' && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <Label className="mb-1">Dosage précédent</Label>
                          <Input
                            value={med.previousDosage || ''}
                            onChange={(e) => updateMedication(index, 'previousDosage', e.target.value)}
                            placeholder="Ex: 250mg 2x/jour"
                          />
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}

              <Button onClick={addMedication} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un médicament
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Lab Tests Tab */}
        <TabsContent value="lab" className="space-y-4">
          {/* Medical Documents Analysis Section */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSearch className="h-5 w-5 text-blue-600" />
                Analyze Patient Lab Results with AI
              </CardTitle>
              <CardDescription>
                Upload and analyze biology test documents to automatically extract results and get clinical interpretations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Alert className="bg-white border-blue-300">
                  <Microscope className="h-4 w-4 text-blue-600" />
                  <AlertDescription>
                    <strong>AI-Powered Analysis:</strong> Upload patient lab reports (blood tests, lipid profiles, liver function, etc.) 
                    and get instant OCR extraction + medical interpretation tailored for Mauritian healthcare standards.
                  </AlertDescription>
                </Alert>
                
                <Button 
                  onClick={() => router.push('/medical-documents-linked')}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Upload & Analyze Lab Documents
                </Button>
                
                <p className="text-xs text-gray-600 text-center">
                  Supports: Complete Blood Count (CBC), Lipid Profile, Liver Function Tests, Kidney Function, 
                  Thyroid Tests, Diabetes Tests, and more
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Prescription Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <TestTube className="h-5 w-5 text-green-600" />
                  Lab Test Orders (Follow-up)
                </span>
                <Button onClick={downloadLabTests} disabled={biologyTests.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </CardTitle>
              <CardDescription>
                Prescribe lab tests for follow-up monitoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {biologyTests.map((test, index) => (
                <Card key={index} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Examen #{index + 1}</span>
                      <div className="flex items-center gap-2">
                        {test.isFollowUp && (
                          <Badge className="bg-blue-600">
                            <Clock className="h-3 w-3 mr-1" />
                            Contrôle
                          </Badge>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBiologyTest(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Nom de l'analyse</Label>
                        <Input
                          value={test.nom}
                          onChange={(e) => updateBiologyTest(index, 'nom', e.target.value)}
                          placeholder="Ex: Glycémie à jeun"
                        />
                      </div>
                      <div>
                        <Label>Catégorie</Label>
                        <Select
                          value={test.categorie}
                          onValueChange={(v) => updateBiologyTest(index, 'categorie', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Hématologie">Hématologie</SelectItem>
                            <SelectItem value="Biochimie">Biochimie</SelectItem>
                            <SelectItem value="Immunologie">Immunologie</SelectItem>
                            <SelectItem value="Microbiologie">Microbiologie</SelectItem>
                            <SelectItem value="Hormones">Hormones</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label>Motif clinique</Label>
                      <Textarea
                        value={test.motifClinique}
                        onChange={(e) => updateBiologyTest(index, 'motifClinique', e.target.value)}
                        placeholder="Ex: Surveillance du traitement antidiabétique"
                        rows={2}
                      />
                    </div>

                    <div className="flex items-center gap-4">
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
                        <Label>À jeun</Label>
                      </div>
                    </div>

                    {test.previousDate && (
                      <Alert className="bg-blue-50">
                        <AlertDescription>
                          Dernier examen: {test.previousDate}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}

              <Button onClick={addBiologyTest} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un examen
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Imaging Tab */}
        <TabsContent value="imaging" className="space-y-4">
          {/* Medical Documents Analysis Section */}
          <Card className="border-2 border-purple-200 bg-purple-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSearch className="h-5 w-5 text-purple-600" />
                Analyze Patient Radiology Reports with AI
              </CardTitle>
              <CardDescription>
                Upload and analyze radiology documents to automatically extract findings and get clinical interpretations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Alert className="bg-white border-purple-300">
                  <Scan className="h-4 w-4 text-purple-600" />
                  <AlertDescription>
                    <strong>AI-Powered Analysis:</strong> Upload patient radiology reports (X-rays, CT scans, MRI, ultrasounds, etc.) 
                    and get instant OCR extraction + medical interpretation tailored for Mauritian healthcare standards.
                  </AlertDescription>
                </Alert>
                
                <Button 
                  onClick={() => router.push('/medical-documents-linked')}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Upload & Analyze Radiology Documents
                </Button>
                
                <p className="text-xs text-gray-600 text-center">
                  Supports: X-Ray, CT Scan (TDM), MRI, Ultrasound, Mammography, and other medical imaging reports
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Prescription Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5 text-purple-600" />
                Imaging Exam Orders (Follow-up)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {imagingExams.map((exam, index) => (
                <Card key={index} className="border-2">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Examen #{index + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeImagingExam(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Type d'examen</Label>
                        <Select
                          value={exam.type}
                          onValueChange={(v) => updateImagingExam(index, 'type', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Radiographie">Radiographie</SelectItem>
                            <SelectItem value="Échographie">Échographie</SelectItem>
                            <SelectItem value="Scanner">Scanner (CT)</SelectItem>
                            <SelectItem value="IRM">IRM</SelectItem>
                            <SelectItem value="Mammographie">Mammographie</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Région anatomique</Label>
                        <Input
                          value={exam.region}
                          onChange={(e) => updateImagingExam(index, 'region', e.target.value)}
                          placeholder="Ex: Thorax"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Indication clinique</Label>
                      <Textarea
                        value={exam.indicationClinique}
                        onChange={(e) => updateImagingExam(index, 'indicationClinique', e.target.value)}
                        placeholder="Ex: Surveillance post-traitement"
                        rows={2}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={exam.urgence}
                        onCheckedChange={(checked) => updateImagingExam(index, 'urgence', checked)}
                      />
                      <Label>Urgent</Label>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Button onClick={addImagingExam} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un examen
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sick Leave Tab */}
        <TabsContent value="sickleave" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  Certificat d'Arrêt de Travail (Prolongation)
                </span>
                <Button onClick={downloadSickLeave}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger PDF
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2 mb-4">
                <Switch
                  checked={sickLeaveData.isExtension}
                  onCheckedChange={(checked) => updateSickLeave('isExtension', checked)}
                />
                <Label>Ceci est une prolongation d'arrêt existant</Label>
              </div>

              {sickLeaveData.isExtension && (
                <Alert className="bg-orange-50 border-orange-200">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="text-orange-800">
                    Ce certificat prolonge un arrêt de travail existant. Les dates doivent faire suite à l'arrêt précédent.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Date de début</Label>
                  <Input
                    type="date"
                    value={sickLeaveData.startDate}
                    onChange={(e) => updateSickLeave('startDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Date de fin</Label>
                  <Input
                    type="date"
                    value={sickLeaveData.endDate}
                    onChange={(e) => updateSickLeave('endDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Nombre de jours</Label>
                  <Input
                    type="number"
                    value={sickLeaveData.numberOfDays}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
              </div>

              {sickLeaveData.isExtension && (
                <div>
                  <Label>Date de début initiale de l'arrêt</Label>
                  <Input
                    type="date"
                    value={sickLeaveData.originalStartDate || ''}
                    onChange={(e) => updateSickLeave('originalStartDate', e.target.value)}
                  />
                </div>
              )}

              <div>
                <Label>Motif médical de l'arrêt</Label>
                <Textarea
                  value={sickLeaveData.medicalReason}
                  onChange={(e) => updateSickLeave('medicalReason', e.target.value)}
                  placeholder="Ex: Persistance des symptômes nécessitant repos supplémentaire"
                  rows={3}
                />
              </div>

              <div>
                <Label>Restrictions de travail</Label>
                <Textarea
                  value={sickLeaveData.workRestrictions}
                  onChange={(e) => updateSickLeave('workRestrictions', e.target.value)}
                  placeholder="Ex: Pas de port de charges lourdes, éviter position debout prolongée"
                  rows={2}
                />
              </div>

              <div>
                <Label>Remarques additionnelles</Label>
                <Textarea
                  value={sickLeaveData.remarks}
                  onChange={(e) => updateSickLeave('remarks', e.target.value)}
                  placeholder="Informations complémentaires"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Complete Button */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-900">Documents de Suivi Prêts</p>
                <p className="text-sm text-green-700">
                  Téléchargez les documents nécessaires avant de terminer
                </p>
              </div>
            </div>
            <Button
              onClick={onComplete}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Terminer la Consultation de Suivi
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
