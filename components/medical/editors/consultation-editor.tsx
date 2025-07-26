// components/medical/editors/consultation-editor.tsx

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Save, 
  ArrowLeft, 
  RefreshCw, 
  Eye,
  Zap,
  User,
  Calendar
} from 'lucide-react';

/*
 * ConsultationEditor – éditeur de compte‑rendu de consultation factuel.
 *
 * Ce composant édite le compte-rendu de consultation généré automatiquement
 * ou reconstruit à partir des données collectées.
 */

export interface ConsultationEditorProps {
  consultationData?: any;
  patientData?: any;
  clinicalData?: any;
  questionsData?: any;
  diagnosisData?: any;
  doctorData?: any;
  mauritianDocuments?: any;
  onSave: (data: any) => void;
  onDiscard?: () => void;
}

const ConsultationEditor: React.FC<ConsultationEditorProps> = ({
  consultationData,
  patientData,
  clinicalData,
  questionsData,
  diagnosisData,
  doctorData,
  mauritianDocuments,
  onSave,
  onDiscard,
}) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  /**
   * Fonction utilitaire pour extraire uniquement les données réelles
   */
  const getActualData = (obj: any, path: string): string => {
    try {
      const keys = path.split('.');
      let current = obj;
      for (const key of keys) {
        if (!current || typeof current !== 'object' || !(key in current)) {
          return '';
        }
        current = current[key];
      }
      return typeof current === 'string' && current.trim() ? current.trim() : '';
    } catch {
      return '';
    }
  };

  /**
   * ✅ Utilise d'abord les documents mauriciens générés, sinon reconstruit
   */
  const getConsultationFromGenerated = (): any => {
    if (mauritianDocuments?.consultation) {
      const generated = mauritianDocuments.consultation;
      return {
        // En-tête du document
        header: {
          title: generated.header?.title || "COMPTE-RENDU DE CONSULTATION",
          doctorName: generated.header?.doctorName || `Dr. ${doctorData?.full_name || doctorData?.fullName || 'MÉDECIN'}`,
          specialty: generated.header?.specialty || doctorData?.specialty || "Médecine générale",
          address: generated.header?.address || doctorData?.address || "Adresse cabinet",
          city: generated.header?.city || doctorData?.city || "Maurice",
          phone: generated.header?.phone || doctorData?.phone || "+230 xxx xxx xxx",
          email: generated.header?.email || doctorData?.email || "contact@cabinet.mu",
          registrationNumber: generated.header?.registrationNumber || doctorData?.medical_council_number || "Medical Council Reg.",
          date: generated.header?.date || new Date().toLocaleDateString('fr-FR'),
          documentNumber: generated.header?.documentNumber || `CR-${Date.now().toString().slice(-8)}`
        },
        
        // Informations patient
        patient: {
          firstName: generated.patient?.firstName || patientData?.firstName || "",
          lastName: generated.patient?.lastName || patientData?.lastName || "",
          dateOfBirth: generated.patient?.dateOfBirth || patientData?.dateOfBirth || patientData?.birthDate || "",
          age: generated.patient?.age || (patientData?.age ? `${patientData.age} ans` : ""),
          address: generated.patient?.address || patientData?.address || "",
          allergies: generated.patient?.allergies || (Array.isArray(patientData?.allergies) ? patientData.allergies.join(', ') : patientData?.allergies || "Aucune")
        },
        
        // Contenu médical pré-généré
        anamnesis: formatSection(generated.anamnesis),
        physicalExam: formatSection(generated.physicalExam),
        diagnosticAssessment: formatSection(generated.diagnosticAssessment),
        investigationsPlan: formatSection(generated.investigationsPlan),
        therapeuticPlan: formatSection(generated.therapeuticPlan)
      };
    }
    
    // Fallback: construire à partir des données brutes
    return null;
  };

  /**
   * Formate une section du document généré en texte éditable
   */
  const formatSection = (section: any): string => {
    if (!section) return '';
    
    if (typeof section === 'string') return section;
    
    let formatted = '';
    Object.entries(section).forEach(([key, value]) => {
      if (value && typeof value === 'string') {
        const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
        formatted += `${label} :\n${value}\n\n`;
      } else if (Array.isArray(value) && value.length > 0) {
        const label = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
        formatted += `${label} :\n${value.map(item => `• ${item}`).join('\n')}\n\n`;
      }
    });
    
    return formatted.trim();
  };

  /**
   * Construit l'anamnèse basée uniquement sur les données collectées (fallback)
   */
  const buildAnamnesis = (): string => {
    const sections: string[] = [];
    
    // Motif de consultation réel
    const chiefComplaint = getActualData(clinicalData, 'chiefComplaint');
    if (chiefComplaint) {
      sections.push(`MOTIF DE CONSULTATION :\n${chiefComplaint}`);
    }
    
    // Histoire de la maladie actuelle
    const historyOfDisease = getActualData(clinicalData, 'historyOfDisease');
    if (historyOfDisease) {
      sections.push(`HISTOIRE DE LA MALADIE ACTUELLE :\n${historyOfDisease}`);
    }
    
    // Durée des symptômes si mentionnée
    const duration = getActualData(clinicalData, 'duration');
    if (duration) {
      sections.push(`ÉVOLUTION :\nSymptômes évoluant depuis ${duration}`);
    }
    
    // Antécédents médicaux personnels
    const medicalHistory = getActualData(patientData, 'medicalHistory');
    if (medicalHistory) {
      sections.push(`ANTÉCÉDENTS MÉDICAUX PERSONNELS :\n${medicalHistory}`);
    }
    
    // Traitements en cours
    const currentMedications = getActualData(patientData, 'currentMedications');
    if (currentMedications) {
      sections.push(`TRAITEMENTS EN COURS :\n${currentMedications}`);
    }
    
    return sections.join('\n\n');
  };

  /**
   * Construit l'examen physique basé uniquement sur ce qui a été réellement examiné (fallback)
   */
  const buildPhysicalExamination = (): string => {
    const sections: string[] = [];
    
    // Signes vitaux s'ils ont été pris
    const vitalSigns = getActualData(clinicalData, 'vitalSigns');
    if (vitalSigns) {
      sections.push(`SIGNES VITAUX :\n${vitalSigns}`);
    }
    
    // Examens spécifiques seulement s'ils ont été réellement effectués
    const cardiovascularExam = getActualData(clinicalData, 'cardiovascularExam');
    if (cardiovascularExam) {
      sections.push(`EXAMEN CARDIOVASCULAIRE :\n${cardiovascularExam}`);
    }
    
    const respiratoryExam = getActualData(clinicalData, 'respiratoryExam');
    if (respiratoryExam) {
      sections.push(`EXAMEN PULMONAIRE :\n${respiratoryExam}`);
    }
    
    const abdominalExam = getActualData(clinicalData, 'abdominalExam');
    if (abdominalExam) {
      sections.push(`EXAMEN ABDOMINAL :\n${abdominalExam}`);
    }
    
    const neurologicalExam = getActualData(clinicalData, 'neurologicalExam');
    if (neurologicalExam) {
      sections.push(`EXAMEN NEUROLOGIQUE :\n${neurologicalExam}`);
    }
    
    return sections.join('\n\n');
  };

  /**
   * Construit la synthèse diagnostique (fallback)
   */
  const buildDiagnosticSynthesis = (): string => {
    const sections: string[] = [];
    
    // Diagnostic principal seulement s'il existe
    const primaryDiag = consultationData?.diagnosticAssessment?.primaryDiagnosis || 
                       diagnosisData?.primary_diagnosis ||
                       diagnosisData?.diagnosis?.primary;
    
    if (primaryDiag?.condition) {
      let diagText = `DIAGNOSTIC RETENU :\n${primaryDiag.condition}`;
      
      if (primaryDiag.severity) {
        diagText += ` (${primaryDiag.severity})`;
      }
      
      if (primaryDiag.confidence || primaryDiag.probability) {
        diagText += ` - Degré de certitude : ${primaryDiag.confidence || primaryDiag.probability}%`;
      }
      
      sections.push(diagText);
      
      // Arguments diagnostiques s'ils existent
      const rationale = primaryDiag.clinical_rationale || primaryDiag.rationale;
      if (rationale) {
        sections.push(`ARGUMENTS DIAGNOSTIQUES :\n${rationale}`);
      }
    }
    
    return sections.join('\n\n');
  };

  /**
   * État du formulaire - ✅ Priorité aux documents générés
   */
  const [formData, setFormData] = useState<any>({
    // En-tête
    header: {},
    patient: {},
    // Sections de contenu
    anamnesis: '',
    physicalExamination: '',
    diagnosticSynthesis: '',
    investigationsPlan: '',
    therapeuticPlan: '',
  });

  // ✅ Remplissage du formulaire avec priorité aux documents générés
  useEffect(() => {
    console.log('📝 Initializing consultation editor with generated docs:', mauritianDocuments?.consultation);
    
    const generatedConsultation = getConsultationFromGenerated();
    
    if (generatedConsultation) {
      // ✅ Utiliser les documents pré-générés
      console.log('✅ Using pre-generated consultation document');
      setFormData({
        header: generatedConsultation.header,
        patient: generatedConsultation.patient,
        anamnesis: generatedConsultation.anamnesis,
        physicalExamination: generatedConsultation.physicalExam,
        diagnosticSynthesis: generatedConsultation.diagnosticAssessment,
        investigationsPlan: generatedConsultation.investigationsPlan,
        therapeuticPlan: generatedConsultation.therapeuticPlan
      });
    } else {
      // ❌ Fallback: construire à partir des données brutes
      console.log('⚠️ Fallback: building consultation from raw data');
      const compiledData = {
        header: {
          title: "COMPTE-RENDU DE CONSULTATION",
          doctorName: `Dr. ${doctorData?.full_name || doctorData?.fullName || 'MÉDECIN'}`,
          specialty: doctorData?.specialty || "Médecine générale",
          date: new Date().toLocaleDateString('fr-FR')
        },
        patient: {
          firstName: patientData?.firstName || "",
          lastName: patientData?.lastName || "",
          age: patientData?.age ? `${patientData.age} ans` : "",
          address: patientData?.address || ""
        },
        anamnesis: buildAnamnesis(),
        physicalExamination: buildPhysicalExamination(),
        diagnosticSynthesis: buildDiagnosticSynthesis(),
        investigationsPlan: "",
        therapeuticPlan: ""
      };
      
      setFormData(compiledData);
    }
    
    setHasUnsavedChanges(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mauritianDocuments, consultationData, diagnosisData, patientData, clinicalData]);

  /**
   * Gestion des changements
   */
  const handleChange = (field: string, value: string) => {
    setHasUnsavedChanges(true);
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleHeaderChange = (field: string, value: string) => {
    setHasUnsavedChanges(true);
    setFormData((prev: any) => ({
      ...prev,
      header: { ...prev.header, [field]: value }
    }));
  };

  const handlePatientChange = (field: string, value: string) => {
    setHasUnsavedChanges(true);
    setFormData((prev: any) => ({
      ...prev,
      patient: { ...prev.patient, [field]: value }
    }));
  };

  /**
   * Sauvegarde
   */
  const handleSave = () => {
    if (onSave) {
      onSave(formData);
    }
    setHasUnsavedChanges(false);
  };

  const handleDiscard = () => {
    if (onDiscard) {
      onDiscard();
    }
  };

  const togglePreview = () => {
    setIsPreview(!isPreview);
  };

  const formatPreview = () => {
    return `
**${formData.header?.title || 'COMPTE-RENDU DE CONSULTATION'}**

**${formData.header?.doctorName || 'Dr. MÉDECIN'}**
Spécialité : ${formData.header?.specialty || 'Médecine générale'}
Date : ${formData.header?.date || new Date().toLocaleDateString('fr-FR')}

═══════════════════════════════════════════════

**PATIENT :**
Nom : ${formData.patient?.firstName || ''} ${formData.patient?.lastName || ''}
Âge : ${formData.patient?.age || ''}
Adresse : ${formData.patient?.address || ''}

**ANAMNÈSE :**
${formData.anamnesis || 'Non documenté'}

**EXAMEN PHYSIQUE :**
${formData.physicalExamination || 'Non documenté'}

**SYNTHÈSE DIAGNOSTIQUE :**
${formData.diagnosticSynthesis || 'Non documenté'}

**PLAN D'INVESTIGATIONS :**
${formData.investigationsPlan || 'Non documenté'}

**PLAN THÉRAPEUTIQUE :**
${formData.therapeuticPlan || 'Non documenté'}

═══════════════════════════════════════════════

**${formData.header?.doctorName || 'Dr. MÉDECIN'}**
Date : ${formData.header?.date || new Date().toLocaleDateString('fr-FR')}
    `.trim();
  };

  if (isPreview) {
    return (
      <div className="space-y-6">
        <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="h-6 w-6" />
                Aperçu du Compte-rendu
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={togglePreview}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                ✏️ Éditer
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div 
              className="whitespace-pre-wrap font-mono text-sm leading-relaxed bg-gray-50 p-6 rounded-lg border"
              dangerouslySetInnerHTML={{
                __html: formatPreview()
                  .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #2563eb;">$1</strong>')
                  .replace(/═══.*═══/g, '<hr style="border: 2px solid #2563eb; margin: 20px 0;">')
              }}
            />
          </CardContent>
        </Card>
        
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={togglePreview}>
            ✏️ Continuer l'édition
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Enregistrer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* En-tête de l'éditeur */}
      <Card className="bg-white/95 backdrop-blur-sm shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-emerald-600 text-white">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8" />
              Éditeur de Compte-rendu
              {mauritianDocuments?.consultation && (
                <Badge className="bg-green-500 text-white">
                  <Zap className="h-4 w-4 mr-1" />
                  Pré-généré
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={togglePreview}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                <Eye className="h-4 w-4 mr-2" />
                Aperçu
              </Button>
              {mauritianDocuments?.consultation && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Reload from generated documents
                    const generatedConsultation = getConsultationFromGenerated();
                    if (generatedConsultation) {
                      setFormData({
                        header: generatedConsultation.header,
                        patient: generatedConsultation.patient,
                        anamnesis: generatedConsultation.anamnesis,
                        physicalExamination: generatedConsultation.physicalExam,
                        diagnosticSynthesis: generatedConsultation.diagnosticAssessment,
                        investigationsPlan: generatedConsultation.investigationsPlan,
                        therapeuticPlan: generatedConsultation.therapeuticPlan
                      });
                      setHasUnsavedChanges(false);
                    }
                  }}
                  className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              )}
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Informations d'en-tête */}
      <Card className="bg-white/95 backdrop-blur-sm shadow-lg">
        <CardHeader className="bg-gray-50">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            En-tête du Document
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="doctorName">Médecin</Label>
              <Input
                id="doctorName"
                value={formData.header?.doctorName || ''}
                onChange={(e) => handleHeaderChange('doctorName', e.target.value)}
                placeholder="Dr. Prénom NOM"
              />
            </div>
            <div>
              <Label htmlFor="specialty">Spécialité</Label>
              <Input
                id="specialty"
                value={formData.header?.specialty || ''}
                onChange={(e) => handleHeaderChange('specialty', e.target.value)}
                placeholder="Médecine générale"
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.header?.date ? new Date(formData.header.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                onChange={(e) => handleHeaderChange('date', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="documentNumber">Numéro de document</Label>
              <Input
                id="documentNumber"
                value={formData.header?.documentNumber || ''}
                onChange={(e) => handleHeaderChange('documentNumber', e.target.value)}
                placeholder="CR-XXXXXXXX"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informations patient */}
      <Card className="bg-white/95 backdrop-blur-sm shadow-lg">
        <CardHeader className="bg-gray-50">
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Informations Patient
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="firstName">Prénom</Label>
              <Input
                id="firstName"
                value={formData.patient?.firstName || ''}
                onChange={(e) => handlePatientChange('firstName', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                value={formData.patient?.lastName || ''}
                onChange={(e) => handlePatientChange('lastName', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="age">Âge</Label>
              <Input
                id="age"
                value={formData.patient?.age || ''}
                onChange={(e) => handlePatientChange('age', e.target.value)}
                placeholder="XX ans"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="address">Adresse</Label>
            <Input
              id="address"
              value={formData.patient?.address || ''}
              onChange={(e) => handlePatientChange('address', e.target.value)}
              placeholder="Adresse complète, Maurice"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sections de contenu médical */}
      
      {/* Anamnèse */}
      <Card className="bg-white/95 backdrop-blur-sm shadow-lg">
        <CardHeader className="bg-gray-50">
          <CardTitle className="text-lg font-semibold">Anamnèse</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Textarea
            id="anamnesis"
            value={formData.anamnesis || ''}
            onChange={(e) => handleChange('anamnesis', e.target.value)}
            rows={8}
            placeholder="Motif de consultation, histoire de la maladie actuelle, antécédents, traitements en cours..."
            className="min-h-[200px]"
          />
        </CardContent>
      </Card>

      {/* Examen physique */}
      <Card className="bg-white/95 backdrop-blur-sm shadow-lg">
        <CardHeader className="bg-gray-50">
          <CardTitle className="text-lg font-semibold">Examen physique</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Textarea
            id="physicalExamination"
            value={formData.physicalExamination || ''}
            onChange={(e) => handleChange('physicalExamination', e.target.value)}
            rows={6}
            placeholder="Décrivez uniquement les examens réellement effectués et leurs résultats..."
            className="min-h-[150px]"
          />
        </CardContent>
      </Card>

      {/* Synthèse diagnostique */}
      <Card className="bg-white/95 backdrop-blur-sm shadow-lg">
        <CardHeader className="bg-gray-50">
          <CardTitle className="text-lg font-semibold">Synthèse diagnostique</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Textarea
            id="diagnosticSynthesis"
            value={formData.diagnosticSynthesis || ''}
            onChange={(e) => handleChange('diagnosticSynthesis', e.target.value)}
            rows={6}
            placeholder="Diagnostic retenu, arguments diagnostiques, diagnostics différentiels à considérer..."
            className="min-h-[150px]"
          />
        </CardContent>
      </Card>

      {/* Plan d'investigations */}
      <Card className="bg-white/95 backdrop-blur-sm shadow-lg">
        <CardHeader className="bg-gray-50">
          <CardTitle className="text-lg font-semibold">Plan d'investigations</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Textarea
            id="investigationsPlan"
            value={formData.investigationsPlan || ''}
            onChange={(e) => handleChange('investigationsPlan', e.target.value)}
            rows={6}
            placeholder="Examens biologiques et paracliniques prescrits..."
            className="min-h-[150px]"
          />
        </CardContent>
      </Card>

      {/* Plan thérapeutique */}
      <Card className="bg-white/95 backdrop-blur-sm shadow-lg">
        <CardHeader className="bg-gray-50">
          <CardTitle className="text-lg font-semibold">Plan thérapeutique</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <Textarea
            id="therapeuticPlan"
            value={formData.therapeuticPlan || ''}
            onChange={(e) => handleChange('therapeuticPlan', e.target.value)}
            rows={8}
            placeholder="Traitements prescrits, recommandations données, suivi prévu..."
            className="min-h-[200px]"
          />
        </CardContent>
      </Card>

      {/* Indicateur de changements non sauvegardés */}
      {hasUnsavedChanges && (
        <Card className="bg-amber-50 border border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="h-5 w-5 text-amber-600" />
              <p className="text-amber-800 font-medium">
                Modifications non sauvegardées
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Boutons d'action */}
      <div className="flex justify-between items-center pt-4">
        <Button 
          variant="outline" 
          onClick={handleDiscard}
          className="px-6 py-3"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Annuler
        </Button>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={togglePreview}
            className="px-6 py-3"
          >
            <Eye className="h-4 w-4 mr-2" />
            Aperçu
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={!hasUnsavedChanges}
            className={`px-8 py-3 ${hasUnsavedChanges ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400'} text-white`}
          >
            <Save className="h-4 w-4 mr-2" />
            Enregistrer le compte-rendu
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConsultationEditor;
