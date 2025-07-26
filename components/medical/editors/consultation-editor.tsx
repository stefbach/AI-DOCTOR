import React, { useState, useEffect } from 'react';

/*
 * ConsultationEditor – éditeur de compte‑rendu de consultation factuel.
 *
 * Ce composant génère un véritable compte-rendu de consultation basé 
 * uniquement sur les données réellement collectées, sans inventer 
 * d'informations fictives.
 */

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

export interface ConsultationEditorProps {
  consultationData?: any;
  patientData?: any;
  clinicalData?: any;
  questionsData?: any;
  diagnosisData?: any;
  doctorData?: any;
  mauritianDocuments?: any;
  onSave: (data: any) => void;
  onDiscard: () => void;
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
   * Construit l'anamnèse basée uniquement sur les données collectées
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
   * Construit l'examen physique basé uniquement sur ce qui a été réellement examiné
   */
  const buildPhysicalExamination = (): string => {
    const sections: string[] = [];
    
    // Utiliser l'examen physique du rapport s'il existe et n'est pas générique
    const reportedExam = getActualData(consultationData, 'anamnesis.physicalExam');
    if (reportedExam && 
        !reportedExam.includes('conscience claire, bonne coloration') && 
        !reportedExam.includes('pas de signe de gravité')) {
      sections.push(reportedExam);
    }
    
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
   * Construit la synthèse diagnostique
   */
  const buildDiagnosticSynthesis = (): string => {
    const sections: string[] = [];
    
    // Diagnostic principal seulement s'il existe
    const primaryDiag = consultationData?.diagnosticAssessment?.primaryDiagnosis || 
                       diagnosisData?.primary_diagnosis;
    
    if (primaryDiag?.condition) {
      let diagText = `DIAGNOSTIC RETENU :\n${primaryDiag.condition}`;
      
      if (primaryDiag.severity) {
        diagText += ` (${primaryDiag.severity})`;
      }
      
      if (primaryDiag.probability) {
        diagText += ` - Degré de certitude : ${primaryDiag.probability}%`;
      }
      
      sections.push(diagText);
      
      // Arguments diagnostiques s'ils existent
      const rationale = primaryDiag.clinical_rationale || primaryDiag.rationale;
      if (rationale) {
        sections.push(`ARGUMENTS DIAGNOSTIQUES :\n${rationale}`);
      }
    }
    
    // Diagnostics différentiels seulement s'ils existent vraiment
    const differentials = consultationData?.diagnosticAssessment?.differentialDiagnosis || 
                         diagnosisData?.differential_diagnoses;
    
    if (Array.isArray(differentials) && differentials.length > 0) {
      const validDifferentials = differentials.filter(d => d.condition && d.condition.trim());
      
      if (validDifferentials.length > 0) {
        sections.push('DIAGNOSTICS DIFFÉRENTIELS À CONSIDÉRER :');
        validDifferentials.forEach((dd: any) => {
          let diffText = `• ${dd.condition}`;
          if (dd.probability) {
            diffText += ` (${dd.probability}%)`;
          }
          if (dd.rationale) {
            diffText += ` - ${dd.rationale}`;
          }
          sections.push(diffText);
        });
      }
    }
    
    return sections.join('\n\n');
  };

  /**
   * Construit le plan de prise en charge basé sur les recommandations réelles
   */
  const buildManagementPlan = (): string => {
    const sections: string[] = [];
    
    // Investigations prévues
    const investigations = consultationData?.investigationsPlan;
    if (investigations) {
      const plannedTests: string[] = [];
      
      // Tests urgents
      if (investigations.laboratoryTests?.urgentTests?.length > 0) {
        plannedTests.push(`Examens biologiques urgents : ${investigations.laboratoryTests.urgentTests.join(', ')}`);
      }
      
      // Tests de routine
      if (investigations.laboratoryTests?.routineTests?.length > 0) {
        plannedTests.push(`Examens biologiques de routine : ${investigations.laboratoryTests.routineTests.join(', ')}`);
      }
      
      // Imagerie urgente
      if (investigations.imaging?.urgent?.length > 0) {
        plannedTests.push(`Imagerie urgente : ${investigations.imaging.urgent.join(', ')}`);
      }
      
      // Imagerie de routine
      if (investigations.imaging?.routine?.length > 0) {
        plannedTests.push(`Imagerie de routine : ${investigations.imaging.routine.join(', ')}`);
      }
      
      if (plannedTests.length > 0) {
        sections.push(`EXAMENS COMPLÉMENTAIRES PRESCRITS :\n${plannedTests.join('\n')}`);
      }
    }
    
    // Traitement immédiat
    const therapeuticPlan = consultationData?.therapeuticPlan;
    if (therapeuticPlan?.immediateManagement) {
      const treatments: string[] = [];
      
      if (therapeuticPlan.immediateManagement.urgentInterventions?.length > 0) {
        treatments.push(`Mesures urgentes : ${therapeuticPlan.immediateManagement.urgentInterventions.join(', ')}`);
      }
      
      if (therapeuticPlan.immediateManagement.symptomaticTreatment?.length > 0) {
        treatments.push(`Traitement symptomatique : ${therapeuticPlan.immediateManagement.symptomaticTreatment.join(', ')}`);
      }
      
      if (treatments.length > 0) {
        sections.push(`PRISE EN CHARGE IMMÉDIATE :\n${treatments.join('\n')}`);
      }
    }
    
    // Recommandations non pharmacologiques
    if (therapeuticPlan?.nonPharmacological) {
      const recommendations: string[] = [];
      
      if (therapeuticPlan.nonPharmacological.lifestyleModifications?.length > 0) {
        recommendations.push(`Mesures hygiéno-diététiques : ${therapeuticPlan.nonPharmacological.lifestyleModifications.join(', ')}`);
      }
      
      if (therapeuticPlan.nonPharmacological.patientEducation?.length > 0) {
        recommendations.push(`Conseils donnés : ${therapeuticPlan.nonPharmacological.patientEducation.join(', ')}`);
      }
      
      if (recommendations.length > 0) {
        sections.push(`RECOMMANDATIONS :\n${recommendations.join('\n')}`);
      }
    }
    
    return sections.join('\n\n');
  };

  /**
   * Construit un résumé clinique factuel
   */
  const buildClinicalSummary = (): string => {
    const parts: string[] = [];
    
    // Informations patient de base
    if (patientData?.age && patientData?.gender) {
      const genderText = patientData.gender === 'female' ? 'Patiente' : 'Patient';
      parts.push(`${genderText} de ${patientData.age} ans`);
    }
    
    // Motif principal
    const chiefComplaint = getActualData(clinicalData, 'chiefComplaint');
    if (chiefComplaint) {
      parts.push(`consultant pour ${chiefComplaint.toLowerCase()}`);
    }
    
    // Diagnostic si établi
    const diagnosis = consultationData?.diagnosticAssessment?.primaryDiagnosis?.condition || 
                     diagnosisData?.primary_diagnosis?.condition;
    if (diagnosis) {
      parts.push(`Diagnostic retenu : ${diagnosis}`);
    }
    
    // Conduites tenues
    const hasInvestigations = consultationData?.investigationsPlan?.laboratoryTests?.urgentTests?.length > 0 ||
                             consultationData?.investigationsPlan?.laboratoryTests?.routineTests?.length > 0 ||
                             consultationData?.investigationsPlan?.imaging?.urgent?.length > 0 ||
                             consultationData?.investigationsPlan?.imaging?.routine?.length > 0;
    
    if (hasInvestigations) {
      parts.push('Examens complémentaires prescrits');
    }
    
    const hasTreatment = consultationData?.therapeuticPlan?.immediateManagement?.urgentInterventions?.length > 0 ||
                        consultationData?.therapeuticPlan?.immediateManagement?.symptomaticTreatment?.length > 0;
    
    if (hasTreatment) {
      parts.push('Traitement instauré');
    }
    
    return parts.join('. ') + '.';
  };

  /**
   * État du formulaire
   */
  const [formData, setFormData] = useState<any>({
    clinicalSummary: '',
    anamnesis: '',
    physicalExamination: '',
    diagnosticSynthesis: '',
    managementPlan: '',
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Remplissage du formulaire avec les données réelles uniquement
  useEffect(() => {
    const compiledData = {
      clinicalSummary: buildClinicalSummary(),
      anamnesis: buildAnamnesis(),
      physicalExamination: buildPhysicalExamination(),
      diagnosticSynthesis: buildDiagnosticSynthesis(),
      managementPlan: buildManagementPlan(),
    };
    
    setFormData(compiledData);
    setHasUnsavedChanges(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationData, diagnosisData, patientData, clinicalData]);

  /**
   * Gestion des changements
   */
  const handleChange = (field: string, value: string) => {
    setHasUnsavedChanges(true);
    setFormData((prev: any) => ({ ...prev, [field]: value }));
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

  return (
    <div className="space-y-6">
      {/* Résumé clinique */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Résumé clinique</h2>
        <Textarea
          id="clinicalSummary"
          value={formData.clinicalSummary}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            handleChange('clinicalSummary', e.target.value)
          }
          rows={4}
          placeholder="Résumé factuel de la consultation (patient, motif, diagnostic, conduites)..."
        />
      </section>

      {/* Anamnèse */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Anamnèse</h2>
        <Textarea
          id="anamnesis"
          value={formData.anamnesis}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            handleChange('anamnesis', e.target.value)
          }
          rows={8}
          placeholder="Motif de consultation, histoire de la maladie actuelle, antécédents, traitements en cours..."
        />
      </section>

      {/* Examen physique */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Examen physique</h2>
        <Textarea
          id="physicalExamination"
          value={formData.physicalExamination}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            handleChange('physicalExamination', e.target.value)
          }
          rows={6}
          placeholder="Décrivez uniquement les examens réellement effectués et leurs résultats..."
        />
      </section>

      {/* Synthèse diagnostique */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Synthèse diagnostique</h2>
        <Textarea
          id="diagnosticSynthesis"
          value={formData.diagnosticSynthesis}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            handleChange('diagnosticSynthesis', e.target.value)
          }
          rows={6}
          placeholder="Diagnostic retenu, arguments diagnostiques, diagnostics différentiels à considérer..."
        />
      </section>

      {/* Plan de prise en charge */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Plan de prise en charge</h2>
        <Textarea
          id="managementPlan"
          value={formData.managementPlan}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            handleChange('managementPlan', e.target.value)
          }
          rows={8}
          placeholder="Examens prescrits, traitements instaurés, recommandations données, suivi prévu..."
        />
      </section>

      {/* Boutons d'action */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button variant="secondary" onClick={onDiscard}>
          Annuler
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={!hasUnsavedChanges}
        >
          Enregistrer le compte-rendu
        </Button>
      </div>
    </div>
  );
};

export default ConsultationEditor;
