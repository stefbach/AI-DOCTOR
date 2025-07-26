import React, { useState, useEffect } from 'react';

/*
 * ConsultationEditor – éditeur de compte‑rendu de consultation enrichi.
 *
 * Ce composant React est destiné à remplacer/étendre le fichier
 * `components/medical/editors/consultation-editor.tsx` d'origine. Il intègre
 * deux améliorations principales :
 *   1. L'ajout d'un champ `narrativeSummary` qui présente la consultation
 *      sous forme de récit médical littéraire. Cette synthèse est préremplie
 *      à partir du rapport généré par l'API `/api/generate-consultation-report`.
 *   2. L'inclusion d'une section diagnostique détaillée reprenant le
 *      diagnostic principal, les diagnostics différentiels, les arguments
 *      pour/contre et les examens permettant de les confirmer ou de les
 *      écarter. Ce contenu est extrait de `consultationData.diagnosticAssessment`.
 *
 * Le composant propose également des champs pour l'historique complet, l'examen
 * physique complet et le plan de prise en charge. Ces champs sont
 * préremplis à partir des données existantes (rapport de consultation,
 * données cliniques) et peuvent être édités par l'utilisateur.
 */

// Import de composants d'interface. Ces importations doivent correspondre
// aux chemins utilisés dans votre projet. Ajustez‑les si nécessaire.
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
   * Construit l'historique complet du patient en se basant sur le rapport
   * existant. En l'absence de données, retourne une chaîne vide.
   */
  const buildCompleteHistory = (): string => {
    // Priorité au rapport de consultation déjà généré
    if (consultationData?.anamnesis?.chiefComplaint?.detailedDescription) {
      return consultationData.anamnesis.chiefComplaint.detailedDescription;
    }
    // Fallback : utiliser les informations cliniques collectées précédemment
    const sections: string[] = [];
    if (clinicalData?.chiefComplaint) {
      sections.push(`Motif de consultation : ${clinicalData.chiefComplaint}`);
    }
    if (clinicalData?.duration) {
      sections.push(`Durée des symptômes : ${clinicalData.duration}`);
    }
    if (clinicalData?.historyOfDisease) {
      sections.push(`Histoire de la maladie : ${clinicalData.historyOfDisease}`);
    }
    if (patientData?.medicalHistory) {
      sections.push(`Antécédents médicaux : ${patientData.medicalHistory}`);
    }
    if (patientData?.currentMedications) {
      sections.push(`Médications en cours : ${patientData.currentMedications}`);
    }
    return sections.join('\n\n');
  };

  /**
   * Construit la description de l'examen physique. Si un examen complet est
   * disponible dans le rapport, l'utiliser. Sinon, générer un examen succinct.
   */
  const buildCompleteExamination = (): string => {
    if (consultationData?.anamnesis?.physicalExam) {
      return consultationData.anamnesis.physicalExam;
    }
    // Exemple de fallback : examen général sommaire
    return 'Examen général : conscience claire, bonne coloration des téguments, pas de signe de gravité clinique.';
  };

  /**
   * Construit la section diagnostic en détaillant le diagnostic principal
   * et les diagnostics différentiels. Utilise les informations contenues dans
   * consultationData.diagnosticAssessment.
   */
  const buildDiagnosticSection = (): string => {
    const parts: string[] = [];
    const diag = consultationData?.diagnosticAssessment;
    if (diag?.primaryDiagnosis) {
      const pd = diag.primaryDiagnosis;
      const probabilityStr = pd.probability ? `, confiance ${pd.probability}%` : '';
      parts.push(
        `Diagnostic principal : ${pd.condition} (${pd.severity || 'non précisée'}${probabilityStr}).\n` +
          `Physiopathologie : ${pd.pathophysiology || 'Non spécifiée.'}\n` +
          `Justification clinique : ${pd.clinical_rationale || pd.rationale || 'Non spécifiée.'}`,
      );
    }
    if (Array.isArray(diag?.differentialDiagnosis) && diag.differentialDiagnosis.length > 0) {
      parts.push('Diagnostics différentiels :');
      diag.differentialDiagnosis.forEach((dd: any) => {
        const probability = dd.probability ? `${dd.probability}%` : 'probabilité non précisée';
        parts.push(
          `• ${dd.condition} (${probability}) : ${dd.rationale || ''}.` +
            (dd.discriminating_tests ? ` Tests discriminants : ${dd.discriminating_tests}.` : ''),
        );
      });
    }
    // Fallback : utiliser les données de diagnosisData si la section diagnostique n'est pas définie
    if (!diag?.primaryDiagnosis && diagnosisData?.primary_diagnosis) {
      const pd = diagnosisData.primary_diagnosis;
      const prob = pd.probability ? `, confiance ${pd.probability}%` : '';
      parts.push(
        `Diagnostic principal : ${pd.condition} (${pd.severity || 'non précisée'}${prob}).\n` +
          `Physiopathologie : ${pd.pathophysiology || 'Non spécifiée.'}\n` +
          `Justification clinique : ${pd.clinical_rationale || pd.rationale || 'Non spécifiée.'}`,
      );
      if (Array.isArray(diagnosisData?.differential_diagnoses) && diagnosisData.differential_diagnoses.length > 0) {
        parts.push('Diagnostics différentiels :');
        diagnosisData.differential_diagnoses.forEach((dd: any) => {
          const p = dd.probability ? `${dd.probability}%` : 'probabilité non précisée';
          parts.push(
            `• ${dd.condition} (${p}) : ${dd.rationale || ''}.` +
              (dd.discriminating_tests ? ` Tests discriminants : ${dd.discriminating_tests}.` : ''),
          );
        });
      }
    }
    return parts.join('\n\n');
  };

  /**
   * Construit le plan de prise en charge en s'appuyant sur la structure
   * therapeuticPlan du rapport, les champs investigationsPlan et les
   * recommandations expertes issues du diagnostic (expert_investigations,
   * expert_therapeutics, expert_preventive_measures). Si aucune information
   * pertinente n'est trouvée, propose des conseils génériques.
   */
  const buildCompletePlan = (): string => {
    const parts: string[] = [];
    // Investigations planifiées dans le rapport
    const investigations = consultationData?.investigationsPlan;
    if (investigations) {
      // Tests biologiques urgents
      if (investigations.laboratoryTests?.urgentTests?.length) {
        parts.push(
          'Examens biologiques urgents :\n' +
            investigations.laboratoryTests.urgentTests.join(', '),
        );
      }
      // Tests biologiques de routine
      if (investigations.laboratoryTests?.routineTests?.length) {
        parts.push(
          'Tests biologiques de routine :\n' +
            investigations.laboratoryTests.routineTests.join(', '),
        );
      }
      // Imagerie urgente
      if (investigations.imaging?.urgent?.length) {
        parts.push('Imagerie urgente :\n' + investigations.imaging.urgent.join(', '));
      }
      // Imagerie de routine
      if (investigations.imaging?.routine?.length) {
        parts.push('Imagerie de routine :\n' + investigations.imaging.routine.join(', '));
      }
    }
    // Plan thérapeutique à partir du rapport
    const tp = consultationData?.therapeuticPlan;
    if (tp) {
      const im = tp.immediateManagement;
      const np = tp.nonPharmacological;
      if (im?.urgentInterventions?.length) {
        parts.push('Interventions urgentes :\n' + im.urgentInterventions.join(', '));
      }
      if (im?.symptomaticTreatment?.length) {
        parts.push('Traitement symptomatique :\n' + im.symptomaticTreatment.join(', '));
      }
      if (im?.supportiveCare?.length) {
        parts.push('Soins de support :\n' + im.supportiveCare.join(', '));
      }
      if (np?.lifestyleModifications?.length) {
        parts.push('Modifications du mode de vie :\n' + np.lifestyleModifications.join(', '));
      }
      if (np?.physicalTherapy?.length) {
        parts.push('Physiothérapie :\n' + np.physicalTherapy.join(', '));
      }
      if (np?.patientEducation?.length) {
        parts.push('Éducation du patient :\n' + np.patientEducation.join(', '));
      }
    }
    // Recommandations expertes provenant du diagnostic (si disponibles)
    const expert = diagnosisData?.expertAnalysis;
    if (expert) {
      if (Array.isArray(expert.expert_investigations) && expert.expert_investigations.length) {
        parts.push('Examens recommandés par l’IA :\n' + expert.expert_investigations.join(', '));
      }
      if (Array.isArray(expert.expert_therapeutics) && expert.expert_therapeutics.length) {
        parts.push('Traitements proposés par l’IA :\n' + expert.expert_therapeutics.join(', '));
      }
      if (Array.isArray(expert.expert_preventive_measures) && expert.expert_preventive_measures.length) {
        parts.push(
          'Mesures préventives recommandées par l’IA :\n' + expert.expert_preventive_measures.join(', '),
        );
      }
    }
    // Recommandations spécifiques présentes directement sur diagnosisData
    if (Array.isArray(diagnosisData?.specific_examinations) && diagnosisData.specific_examinations.length) {
      parts.push(
        'Examens spécifiques recommandés :\n' + diagnosisData.specific_examinations.join(', '),
      );
    }
    if (Array.isArray(diagnosisData?.specific_treatments) && diagnosisData.specific_treatments.length) {
      parts.push(
        'Traitements spécifiques recommandés :\n' + diagnosisData.specific_treatments.join(', '),
      );
    }
    // Fallback : si aucune recommandation spécifique n'a été générée
    if (parts.length === 0) {
      parts.push('Hydratation, repos et réévaluation clinique à court terme.');
    }
    return parts.join('\n\n');
  };

  /**
   * État du formulaire. Chaque champ correspond à une section du rapport.
   */
  const [formData, setFormData] = useState<any>({
    narrativeSummary: '',
    completeHistory: '',
    completeExamination: '',
    diagnosticSection: '',
    completePlan: '',
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Auto‑remplissage du formulaire à partir du rapport généré ou des données cliniques
  useEffect(() => {
    const autoFilled = {
      narrativeSummary: consultationData?.narrativeSummary || buildCompleteHistory(),
      completeHistory: buildCompleteHistory(),
      completeExamination: buildCompleteExamination(),
      diagnosticSection: buildDiagnosticSection(),
      completePlan: buildCompletePlan(),
    };
    setFormData((prev: any) => ({ ...prev, ...autoFilled }));
    // On considère que le formulaire n'a pas de modifications non sauvegardées lors du remplissage initial
    setHasUnsavedChanges(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultationData, diagnosisData]);

  /**
   * Gestion des changements dans le formulaire. Marque le formulaire comme modifié.
   */
  const handleChange = (field: string, value: string) => {
    setHasUnsavedChanges(true);
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  /**
   * Sauvegarde du formulaire. Appelle le callback onSave transmis en prop.
   */
  const handleSave = () => {
    if (onSave) {
      onSave(formData);
    }
    setHasUnsavedChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Résumé narratif */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Résumé narratif de la consultation</h2>
        <Textarea
          id="narrativeSummary"
          value={formData.narrativeSummary}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            handleChange('narrativeSummary', e.target.value)
          }
          rows={8}
          placeholder="Rédigez un résumé fluide de la consultation…"
        />
      </section>

      {/* Historique complet */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Historique complet</h2>
        <Textarea
          id="completeHistory"
          value={formData.completeHistory}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            handleChange('completeHistory', e.target.value)
          }
          rows={6}
          placeholder="Décrivez l'historique de la maladie…"
        />
      </section>

      {/* Examen physique */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Examen physique</h2>
        <Textarea
          id="completeExamination"
          value={formData.completeExamination}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            handleChange('completeExamination', e.target.value)
          }
          rows={6}
          placeholder="Décrivez l'examen physique en détail…"
        />
      </section>

      {/* Diagnostic */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Diagnostic</h2>
        <Textarea
          id="diagnosticSection"
          value={formData.diagnosticSection}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            handleChange('diagnosticSection', e.target.value)
          }
          rows={8}
          placeholder="Présentez le diagnostic principal et les diagnostics différentiels…"
        />
      </section>

      {/* Plan de prise en charge */}
      <section>
        <h2 className="text-lg font-semibold mb-2">Plan de prise en charge</h2>
        <Textarea
          id="completePlan"
          value={formData.completePlan}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
            handleChange('completePlan', e.target.value)
          }
          rows={8}
          placeholder="Décrivez le plan d'investigation et de traitement…"
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
          Enregistrer
        </Button>
      </div>
    </div>
  );
};

export default ConsultationEditor;
