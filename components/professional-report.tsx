// components/professional-report.tsx
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Download, 
  Printer, 
  CheckCircle,
  Loader2,
  Eye,
  Share2,
  Calendar,
  User,
  Stethoscope,
  FileSignature,
  Edit3,
  Save,
  X,
  TestTube,
  Pill,
  Activity,
  Plus,
  Trash2
} from "lucide-react";

interface ProfessionalReportProps {
  patientData: any;
  clinicalData: any;
  questionsData: any;
  diagnosisData: any;
  editedDocuments?: any;
  onComplete?: (data: any) => void;
  onPrevious?: () => void;
}

interface Prescription {
  id: number;
  exam?: string;
  medication?: string;
  dosage?: string;
  duration?: string;
  indication: string;
  urgency?: string;
  fasting?: string;
  mauritianAvailability?: string;
}

export default function ProfessionalReport({
  patientData,
  clinicalData,
  questionsData,
  diagnosisData,
  editedDocuments,
  onComplete,
  onPrevious
}: ProfessionalReportProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // État pour le compte rendu
  const [report, setReport] = useState<any>(null);
  const [editedReport, setEditedReport] = useState<any>(null);
  const [isEditingReport, setIsEditingReport] = useState(false);
  
  // États pour les ordonnances
  const [consultation, setConsultation] = useState<any>(null);
  const [biology, setBiology] = useState<any>(null);
  const [paraclinical, setParaclinical] = useState<any>(null);
  const [medication, setMedication] = useState<any>(null);
  
  // Tab actif
  const [activeTab, setActiveTab] = useState("report");
  
  // État de validation
  const [validationStatus, setValidationStatus] = useState({
    report: false,
    consultation: false,
    biology: false,
    paraclinical: false,
    medication: false
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    generateAllDocuments();
  }, []);

  const generateAllDocuments = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generate-consultation-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientData,
          clinicalData,
          questionsData,
          diagnosisData,
          editedDocuments: editedDocuments || {},
          generateAllDocuments: true
        })
      });

      const contentType = response.headers.get("content-type") || "";
      if (!response.ok || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error(text || `Erreur HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setReport(data.report);
        setEditedReport(data.report);
        setConsultation(data.documents.consultation);
        setBiology(data.documents.biology);
        setParaclinical(data.documents.paraclinical);
        setMedication(data.documents.medication);
      } else {
        throw new Error(data.error || "Erreur lors de la génération");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  // Handlers pour l'édition du rapport
  const handleReportFieldChange = (field: string, value: string) => {
    setEditedReport((prev: any) => ({
      ...prev,
      rapport: {
        ...prev.rapport,
        [field]: value
      }
    }));
  };

  // Handlers pour la consultation
  const handleConsultationChange = (section: string, field: string, value: string) => {
    setConsultation((prev: any) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  // Handlers pour la biologie
  const handleBiologyPrescriptionChange = (index: number, field: string, value: string) => {
    setBiology((prev: any) => ({
      ...prev,
      prescriptions: prev.prescriptions.map((p: any, i: number) => 
        i === index ? { ...p, [field]: value } : p
      )
    }));
  };

  const addBiologyPrescription = () => {
    setBiology((prev: any) => ({
      ...prev,
      prescriptions: [...prev.prescriptions, {
        id: Date.now(),
        exam: "",
        indication: "",
        urgency: "Semi-urgent (24-48h)",
        fasting: "Non",
        mauritianAvailability: "Disponible laboratoires Maurice"
      }]
    }));
  };

  const removeBiologyPrescription = (index: number) => {
    setBiology((prev: any) => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((_: any, i: number) => i !== index)
    }));
  };

  // Handlers pour paraclinique
  const handleParaclinicalPrescriptionChange = (index: number, field: string, value: string) => {
    setParaclinical((prev: any) => ({
      ...prev,
      prescriptions: prev.prescriptions.map((p: any, i: number) => 
        i === index ? { ...p, [field]: value } : p
      )
    }));
  };

  const addParaclinicalPrescription = () => {
    setParaclinical((prev: any) => ({
      ...prev,
      prescriptions: [...prev.prescriptions, {
        id: Date.now(),
        exam: "",
        indication: "",
        urgency: "Programmé (3-7 jours)",
        preparation: "",
        mauritianAvailability: "Disponible"
      }]
    }));
  };

  const removeParaclinicalPrescription = (index: number) => {
    setParaclinical((prev: any) => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((_: any, i: number) => i !== index)
    }));
  };

  // Handlers pour médicaments
  const handleMedicationPrescriptionChange = (index: number, field: string, value: string) => {
    setMedication((prev: any) => ({
      ...prev,
      prescriptions: prev.prescriptions.map((p: any, i: number) => 
        i === index ? { ...p, [field]: value } : p
      )
    }));
  };

  const addMedicationPrescription = () => {
    setMedication((prev: any) => ({
      ...prev,
      prescriptions: [...prev.prescriptions, {
        id: Date.now(),
        medication: "",
        dosage: "",
        frequency: "",
        duration: "",
        indication: "",
        specialInstructions: ""
      }]
    }));
  };

  const removeMedicationPrescription = (index: number) => {
    setMedication((prev: any) => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((_: any, i: number) => i !== index)
    }));
  };

  // Validation handlers
  const validateReport = () => {
    setReport(editedReport);
    setIsEditingReport(false);
    setValidationStatus(prev => ({ ...prev, report: true }));
  };

  const validateDocument = (docType: string) => {
    setValidationStatus(prev => ({ ...prev, [docType]: true }));
  };

  // Finalisation
  const handleFinalComplete = () => {
    const finalData = {
      report: report,
      documents: {
        consultation: consultation,
        biology: biology,
        paraclinical: paraclinical,
        medication: medication
      },
      completedAt: new Date().toISOString()
    };
    
    if (onComplete) {
      onComplete(finalData);
    }
  };

  const isAllValidated = Object.values(validationStatus).every(status => status);

  // Gestion du loading
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-20">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
            <p className="text-lg font-semibold">Génération du dossier médical complet...</p>
            <p className="text-sm text-gray-600">Compte rendu et ordonnances en cours</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Gestion de l'erreur
  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="text-center py-10">
          <p className="text-red-600">Erreur : {error}</p>
          <Button onClick={generateAllDocuments} className="mt-4">
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Si pas de rapport, retourner null
  if (!report) {
    return null;
  }

  // Rendu principal
  return (
    <div className="space-y-6">
      {/* Header avec statut global */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl">Dossier Médical Complet - Édition et Validation</CardTitle>
            <div className="flex items-center gap-4">
              <Badge variant={isAllValidated ? "default" : "outline"}>
                {Object.values(validationStatus).filter(s => s).length} / 5 validés
              </Badge>
              {isAllValidated && (
                <Button 
                  onClick={handleFinalComplete} 
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finaliser le Dossier
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs pour naviguer entre les documents */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="report" className="flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            Compte Rendu
            {validationStatus.report && <CheckCircle className="h-3 w-3 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="consultation" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Consultation
            {validationStatus.consultation && <CheckCircle className="h-3 w-3 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="biology" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            Biologie
            {validationStatus.biology && <CheckCircle className="h-3 w-3 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="paraclinical" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Paraclinique
            {validationStatus.paraclinical && <CheckCircle className="h-3 w-3 text-green-600" />}
          </TabsTrigger>
          <TabsTrigger value="medication" className="flex items-center gap-2">
            <Pill className="h-4 w-4" />
            Médicaments
            {validationStatus.medication && <CheckCircle className="h-3 w-3 text-green-600" />}
          </TabsTrigger>
        </TabsList>

        {/* Tab Compte Rendu */}
        <TabsContent value="report">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Compte Rendu Professionnel</CardTitle>
                <div className="flex gap-2">
                  {!isEditingReport ? (
                    <>
                      <Button variant="outline" size="sm" onClick={() => setIsEditingReport(true)}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Éditer
                      </Button>
                      {!validationStatus.report && (
                        <Button size="sm" onClick={() => validateDocument('report')}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Valider
                        </Button>
                      )}
                    </>
                  ) : (
                    <>
                      <Button variant="outline" size="sm" onClick={() => {
                        setEditedReport(report);
                        setIsEditingReport(false);
                      }}>
                        <X className="h-4 w-4 mr-2" />
                        Annuler
                      </Button>
                      <Button size="sm" onClick={validateReport}>
                        <Save className="h-4 w-4 mr-2" />
                        Sauvegarder
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!isEditingReport ? (
                // Mode lecture
                <div className="prose prose-lg max-w-none space-y-6">
                  <section>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">MOTIF DE CONSULTATION</h2>
                    <p className="text-gray-700 leading-relaxed">{report?.rapport?.motifConsultation || "Non renseigné"}</p>
                  </section>
                  
                  <section>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">ANAMNÈSE</h2>
                    <p className="text-gray-700 leading-relaxed">{report?.rapport?.anamnese || "Non renseigné"}</p>
                  </section>
                  
                  <section>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">EXAMEN CLINIQUE</h2>
                    <p className="text-gray-700 leading-relaxed">{report?.rapport?.examenClinique || "Non renseigné"}</p>
                  </section>
                  
                  <section>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">DIAGNOSTIC</h2>
                    <p className="text-gray-700 leading-relaxed">{report?.rapport?.diagnostic || "Non renseigné"}</p>
                  </section>
                  
                  <section>
                    <h2 className="text-xl font-bold text-gray-900 mb-3">PLAN DE PRISE EN CHARGE</h2>
                    <p className="text-gray-700 leading-relaxed">{report?.rapport?.plan || "Non renseigné"}</p>
                  </section>
                </div>
              ) : (
                // Mode édition
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="motifConsultation">Motif de consultation</Label>
                    <Textarea
                      id="motifConsultation"
                      value={editedReport?.rapport?.motifConsultation || ""}
                      onChange={(e) => handleReportFieldChange('motifConsultation', e.target.value)}
                      rows={3}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="anamnese">Anamnèse</Label>
                    <Textarea
                      id="anamnese"
                      value={editedReport?.rapport?.anamnese || ""}
                      onChange={(e) => handleReportFieldChange('anamnese', e.target.value)}
                      rows={6}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="examenClinique">Examen clinique</Label>
                    <Textarea
                      id="examenClinique"
                      value={editedReport?.rapport?.examenClinique || ""}
                      onChange={(e) => handleReportFieldChange('examenClinique', e.target.value)}
                      rows={4}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="diagnostic">Diagnostic</Label>
                    <Textarea
                      id="diagnostic"
                      value={editedReport?.rapport?.diagnostic || ""}
                      onChange={(e) => handleReportFieldChange('diagnostic', e.target.value)}
                      rows={2}
                      className="mt-2"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="plan">Plan de prise en charge</Label>
                    <Textarea
                      id="plan"
                      value={editedReport?.rapport?.plan || ""}
                      onChange={(e) => handleReportFieldChange('plan', e.target.value)}
                      rows={4}
                      className="mt-2"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Consultation */}
        <TabsContent value="consultation">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Compte-rendu de Consultation</CardTitle>
                {!validationStatus.consultation && (
                  <Button size="sm" onClick={() => validateDocument('consultation')}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Valider
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Motif principal</Label>
                <Textarea
                  value={consultation?.content?.chiefComplaint || ''}
                  onChange={(e) => handleConsultationChange('content', 'chiefComplaint', e.target.value)}
                  rows={2}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label>Anamnèse</Label>
                <Textarea
                  value={consultation?.content?.history || ''}
                  onChange={(e) => handleConsultationChange('content', 'history', e.target.value)}
                  rows={6}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label>Examen clinique</Label>
                <Textarea
                  value={consultation?.content?.examination || ''}
                  onChange={(e) => handleConsultationChange('content', 'examination', e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label>Diagnostic</Label>
                <Input
                  value={consultation?.content?.diagnosis || ''}
                  onChange={(e) => handleConsultationChange('content', 'diagnosis', e.target.value)}
                  className="mt-2"
                />
              </div>
              
              <div>
                <Label>Plan de prise en charge</Label>
                <Textarea
                  value={consultation?.content?.plan || ''}
                  onChange={(e) => handleConsultationChange('content', 'plan', e.target.value)}
                  rows={4}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Biologie */}
        <TabsContent value="biology">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Ordonnance - Examens Biologiques</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addBiologyPrescription}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                  {!validationStatus.biology && (
                    <Button size="sm" onClick={() => validateDocument('biology')}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Valider
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {biology?.prescriptions?.map((prescription: any, index: number) => (
                <Card key={prescription.id} className="p-4 border-l-4 border-red-400">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold">Examen #{index + 1}</h4>
                      {biology.prescriptions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBiologyPrescription(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Examen</Label>
                        <Input
                          value={prescription.exam || ''}
                          onChange={(e) => handleBiologyPrescriptionChange(index, 'exam', e.target.value)}
                          placeholder="Ex: NFS, CRP..."
                        />
                      </div>
                      
                      <div>
                        <Label>Urgence</Label>
                        <Select
                          value={prescription.urgency || 'Semi-urgent (24-48h)'}
                          onValueChange={(value) => handleBiologyPrescriptionChange(index, 'urgency', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Urgent (dans les heures)">Urgent</SelectItem>
                            <SelectItem value="Semi-urgent (24-48h)">Semi-urgent</SelectItem>
                            <SelectItem value="Programmé (3-7 jours)">Programmé</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Indication</Label>
                      <Textarea
                        value={prescription.indication || ''}
                        onChange={(e) => handleBiologyPrescriptionChange(index, 'indication', e.target.value)}
                        rows={2}
                        placeholder="Justification médicale"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>À jeun ?</Label>
                        <Select
                          value={prescription.fasting || 'Non'}
                          onValueChange={(value) => handleBiologyPrescriptionChange(index, 'fasting', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Oui">Oui</SelectItem>
                            <SelectItem value="Non">Non</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Disponibilité Maurice</Label>
                        <Select
                          value={prescription.mauritianAvailability || 'Disponible laboratoires Maurice'}
                          onValueChange={(value) => handleBiologyPrescriptionChange(index, 'mauritianAvailability', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Disponible laboratoires Maurice">Disponible</SelectItem>
                            <SelectItem value="Envoi étranger nécessaire">Envoi étranger</SelectItem>
                            <SelectItem value="Non disponible">Non disponible</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Paraclinique */}
        <TabsContent value="paraclinical">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Ordonnance - Examens Paracliniques</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addParaclinicalPrescription}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                  {!validationStatus.paraclinical && (
                    <Button size="sm" onClick={() => validateDocument('paraclinical')}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Valider
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {paraclinical?.prescriptions?.map((prescription: any, index: number) => (
                <Card key={prescription.id} className="p-4 border-l-4 border-blue-400">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold">Examen #{index + 1}</h4>
                      {paraclinical.prescriptions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeParaclinicalPrescription(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Examen</Label>
                        <Input
                          value={prescription.exam || ''}
                          onChange={(e) => handleParaclinicalPrescriptionChange(index, 'exam', e.target.value)}
                          placeholder="Ex: Radiographie, IRM, Scanner..."
                        />
                      </div>
                      
                      <div>
                        <Label>Urgence</Label>
                        <Select
                          value={prescription.urgency || 'Programmé (3-7 jours)'}
                          onValueChange={(value) => handleParaclinicalPrescriptionChange(index, 'urgency', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Urgent (dans les heures)">Urgent</SelectItem>
                            <SelectItem value="Semi-urgent (24-48h)">Semi-urgent</SelectItem>
                            <SelectItem value="Programmé (3-7 jours)">Programmé</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label>Indication</Label>
                      <Textarea
                        value={prescription.indication || ''}
                        onChange={(e) => handleParaclinicalPrescriptionChange(index, 'indication', e.target.value)}
                        rows={2}
                        placeholder="Justification médicale"
                      />
                    </div>
                    
                    <div>
                      <Label>Préparation spéciale</Label>
                      <Input
                        value={prescription.preparation || ''}
                        onChange={(e) => handleParaclinicalPrescriptionChange(index, 'preparation', e.target.value)}
                        placeholder="Ex: À jeun, vessie pleine..."
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Médicaments */}
        <TabsContent value="medication">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Ordonnance Médicamenteuse</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addMedicationPrescription}>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </Button>
                  {!validationStatus.medication && (
                    <Button size="sm" onClick={() => validateDocument('medication')}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Valider
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {medication?.prescriptions?.map((prescription: any, index: number) => (
                <Card key={prescription.id} className="p-4 border-l-4 border-green-400">
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <h4 className="font-semibold">Médicament #{index + 1}</h4>
                      {medication.prescriptions.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMedicationPrescription(index)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Médicament</Label>
                        <Input
                          value={prescription.medication || ''}
                          onChange={(e) => handleMedicationPrescriptionChange(index, 'medication', e.target.value)}
                          placeholder="Nom du médicament"
                        />
                      </div>
                      
                      <div>
                        <Label>Dosage</Label>
                        <Input
                          value={prescription.dosage || ''}
                          onChange={(e) => handleMedicationPrescriptionChange(index, 'dosage', e.target.value)}
                          placeholder="Ex: 500mg"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Fréquence</Label>
                        <Input
                          value={prescription.frequency || ''}
                          onChange={(e) => handleMedicationPrescriptionChange(index, 'frequency', e.target.value)}
                          placeholder="Ex: 2 fois/jour"
                        />
                      </div>
                      
                      <div>
                        <Label>Durée</Label>
                        <Input
                          value={prescription.duration || ''}
                          onChange={(e) => handleMedicationPrescriptionChange(index, 'duration', e.target.value)}
                          placeholder="Ex: 7 jours"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label>Instructions spéciales</Label>
                      <Textarea
                        value={prescription.specialInstructions || ''}
                        onChange={(e) => handleMedicationPrescriptionChange(index, 'specialInstructions', e.target.value)}
                        rows={2}
                        placeholder="Ex: Pendant les repas, éviter l'alcool..."
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions globales */}
      <div className="flex justify-between items-center">
        {onPrevious && (
          <Button variant="outline" onClick={onPrevious}>
            Retour
          </Button>
        )}
        
        <div className="flex gap-3">
          <Button variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            Aperçu Global
          </Button>
          
          <Button variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Imprimer Tout
          </Button>
          
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Télécharger PDF
          </Button>
        </div>

        {isAllValidated && (
          <Button 
            size="lg"
            onClick={handleFinalComplete}
            className="bg-gradient-to-r from-green-600 to-blue-600"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Finaliser la Consultation
          </Button>
        )}
      </div>
    </div>
  );
}
