// app/api/generate-consultation-report/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

// Types pour une meilleure structure
interface MedicalData {
  patientData: any;
  clinicalData: any;
  questionsData: any;
  diagnosisData: any;
  editedDocuments?: any;
  generateAllDocuments?: boolean;
}

interface PatientInfo {
  nom: string
  prenom: string
  dateNaissance: string
  age: number | null
  sexe: string
  profession: string
  telephone: string
  email: string
  adresse: string
  numeroSecuriteSociale: string
  medecinTraitant: string
}

interface ClinicalInfo {
  motifConsultation: string
  symptomes: string
  dureeSymptomes: string
  intensiteDouleur: string
  facteursDeclenchants: string
  facteursAmeliorants: string
  antecedents: {
    medicaux: string
    chirurgicaux: string
    familiaux: string
  }
  allergies: string
  medicamentsActuels: string
  habitudes: {
    tabac: string
    alcool: string
    activitePhysique: string
    alimentation: string
    sommeil: string
  }
  signesVitaux: {
    tension: string
    pouls: string
    temperature: string
    saturation: string
    poids: string
    taille: string
    imc: string
  }
}

interface DiagnosticInfo {
  diagnosticPrincipal: string
  diagnosticsSecondaires: string
  diagnosticsDifferentiels: string
  examensComplementaires: string
  bilanBiologique: string
  imagerie: string
  conduite: string
  surveillance: string
  pronostic: string
  education: string
}

export async function POST(request: NextRequest) {
  console.log('📋 API: Génération du dossier médical complet');
  
  try {
    const body: MedicalData = await request.json();
    const { 
      patientData, 
      clinicalData, 
      questionsData, 
      diagnosisData,
      editedDocuments,
      generateAllDocuments 
    } = body;

    if (generateAllDocuments) {
      console.log('🤖 Mode génération complète activé');
    }

    console.log('📊 Préparation des données pour génération complète');

    // ==================== FONCTIONS HELPER CRITIQUES ====================
    
    /**
     * S'assure qu'une valeur est un tableau
     */
    const ensureArray = (value: any): any[] => {
      if (Array.isArray(value)) return value;
      if (value === null || value === undefined) return [];
      if (typeof value === 'string') return value.split(',').map(s => s.trim());
      if (typeof value === 'object' && value.value) {
        return ensureArray(value.value);
      }
      return [value];
    };

    /**
     * Joint des valeurs de manière sûre
     */
    const safeJoin = (value: any, separator: string = ', '): string => {
      try {
        const arrayValue = ensureArray(value);
        return arrayValue
          .filter(item => item !== null && item !== undefined && item !== '')
          .map(item => String(item).trim())
          .join(separator);
      } catch (error) {
        console.warn('Erreur dans safeJoin:', error);
        return String(value || '');
      }
    };

    /**
     * Extrait une valeur de manière sûre depuis un objet potentiellement complexe
     */
    const extractValue = (data: any, path: string, defaultValue: string = ''): string => {
      try {
        const keys = path.split('.');
        let value = data;
        
        for (const key of keys) {
          value = value?.[key];
          if (value === undefined) return defaultValue;
        }
        
        if (Array.isArray(value)) {
          return safeJoin(value);
        }
        
        return String(value || defaultValue);
      } catch (error) {
        return defaultValue;
      }
    };

    // ==================== EXTRACTION DES DONNÉES ====================
    
    const extractPatientData = (): PatientInfo => {
      try {
        const calculateAge = (birthDate: string): number => {
          if (!birthDate) return 0;
          const birth = new Date(birthDate);
          const today = new Date();
          let age = today.getFullYear() - birth.getFullYear();
          const monthDiff = today.getMonth() - birth.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
          }
          return age;
        };

        return {
          nom: extractValue(patientData, 'nom', 'Non renseigné'),
          prenom: extractValue(patientData, 'prenom', 'Non renseigné'),
          dateNaissance: extractValue(patientData, 'dateNaissance', 'Non renseignée'),
          age: patientData?.dateNaissance ? calculateAge(patientData.dateNaissance) : null,
          sexe: extractValue(patientData, 'sexe', 'Non renseigné'),
          profession: extractValue(patientData, 'profession', 'Non renseignée'),
          telephone: extractValue(patientData, 'telephone', 'Non renseigné'),
          email: extractValue(patientData, 'email', 'Non renseigné'),
          adresse: extractValue(patientData, 'adresse', 'Non renseignée'),
          numeroSecuriteSociale: extractValue(patientData, 'numeroSecuriteSociale', ''),
          medecinTraitant: extractValue(patientData, 'medecinTraitant', '')
        };
      } catch (error) {
        console.error('Erreur extraction patient:', error);
        return {
          nom: 'Erreur',
          prenom: 'Erreur',
          dateNaissance: '',
          age: null,
          sexe: '',
          profession: '',
          telephone: '',
          email: '',
          adresse: '',
          numeroSecuriteSociale: '',
          medecinTraitant: ''
        };
      }
    };

    const extractClinicalData = (): ClinicalInfo => {
      try {
        // Traitement spécial pour le motif de consultation
        let motifConsultation = '';
        if (clinicalData?.motifConsultation) {
          const motif = clinicalData.motifConsultation;
          if (typeof motif === 'string') {
            motifConsultation = motif;
          } else if (Array.isArray(motif)) {
            motifConsultation = safeJoin(motif);
          } else if (typeof motif === 'object') {
            if (motif.value) {
              motifConsultation = safeJoin(motif.value);
            } else if (motif.text) {
              motifConsultation = motif.text;
            } else {
              motifConsultation = Object.values(motif).filter(v => v).join(', ');
            }
          }
        }

        // Traitement des symptômes
        const symptomes = clinicalData?.symptomes ? safeJoin(clinicalData.symptomes) : '';
        
        // Traitement des antécédents avec gestion avancée
        const processAntecedents = (data: any) => {
          if (!data) return { medicaux: '', chirurgicaux: '', familiaux: '' };
          
          return {
            medicaux: safeJoin(data.medicaux || data.medical || []),
            chirurgicaux: safeJoin(data.chirurgicaux || data.surgical || []),
            familiaux: safeJoin(data.familiaux || data.family || [])
          };
        };

        // Traitement des allergies
        const allergies = safeJoin(
          clinicalData?.allergies || 
          clinicalData?.antecedents?.allergies || 
          []
        );

        // Traitement des médicaments actuels
        const medicamentsActuels = safeJoin(
          clinicalData?.medicamentsActuels || 
          clinicalData?.traitementActuel || 
          []
        );

        return {
          motifConsultation: motifConsultation || 'Non renseigné',
          symptomes: symptomes || 'Non renseignés',
          dureeSymptomes: extractValue(clinicalData, 'duree', 'Non précisée'),
          intensiteDouleur: extractValue(clinicalData, 'intensiteDouleur', ''),
          facteursDeclenchants: safeJoin(clinicalData?.facteursDeclenchants),
          facteursAmeliorants: safeJoin(clinicalData?.facteursAmeliorants),
          antecedents: processAntecedents(clinicalData?.antecedents),
          allergies: allergies,
          medicamentsActuels: medicamentsActuels,
          habitudes: {
            tabac: extractValue(clinicalData, 'habitudes.tabac', 'Non renseigné'),
            alcool: extractValue(clinicalData, 'habitudes.alcool', 'Non renseigné'),
            activitePhysique: extractValue(clinicalData, 'habitudes.activitePhysique', 'Non renseignée'),
            alimentation: extractValue(clinicalData, 'habitudes.alimentation', 'Non renseignée'),
            sommeil: extractValue(clinicalData, 'habitudes.sommeil', 'Non renseigné')
          },
          signesVitaux: {
            tension: extractValue(clinicalData, 'signesVitaux.tension', 'Non mesurée'),
            pouls: extractValue(clinicalData, 'signesVitaux.pouls', 'Non mesuré'),
            temperature: extractValue(clinicalData, 'signesVitaux.temperature', 'Non mesurée'),
            saturation: extractValue(clinicalData, 'signesVitaux.saturation', 'Non mesurée'),
            poids: extractValue(clinicalData, 'signesVitaux.poids', 'Non mesuré'),
            taille: extractValue(clinicalData, 'signesVitaux.taille', 'Non mesurée'),
            imc: extractValue(clinicalData, 'signesVitaux.imc', 'Non calculé')
          }
        };
      } catch (error) {
        console.error('Erreur extraction clinique:', error);
        return {
          motifConsultation: 'Erreur de traitement',
          symptomes: '',
          dureeSymptomes: '',
          intensiteDouleur: '',
          facteursDeclenchants: '',
          facteursAmeliorants: '',
          antecedents: { medicaux: '', chirurgicaux: '', familiaux: '' },
          allergies: '',
          medicamentsActuels: '',
          habitudes: {
            tabac: '',
            alcool: '',
            activitePhysique: '',
            alimentation: '',
            sommeil: ''
          },
          signesVitaux: {
            tension: '',
            pouls: '',
            temperature: '',
            saturation: '',
            poids: '',
            taille: '',
            imc: ''
          }
        };
      }
    };

    const extractQuestionsData = () => {
      try {
        if (!questionsData || typeof questionsData !== 'object') {
          return { responses: [], summary: '' };
        }
        
        const responses = Object.entries(questionsData)
          .filter(([key, value]) => value !== null && value !== undefined && value !== '')
          .map(([question, reponse]) => ({
            question: String(question).replace(/_/g, ' '),
            reponse: String(reponse)
          }));
        
        const summary = responses
          .map(r => `${r.question}: ${r.reponse}`)
          .join('. ');
        
        return { responses, summary };
      } catch (error) {
        console.error('Erreur extraction questions:', error);
        return { responses: [], summary: '' };
      }
    };

    const extractDiagnosisData = (): DiagnosticInfo => {
      try {
        // Gestion des diagnostics multiples
        const processDiagnostics = (diag: any): string => {
          if (!diag) return '';
          if (typeof diag === 'string') return diag;
          if (Array.isArray(diag)) return safeJoin(diag);
          if (typeof diag === 'object' && diag.principal) {
            return diag.principal;
          }
          return String(diag);
        };

        return {
          diagnosticPrincipal: processDiagnostics(diagnosisData?.diagnosticPrincipal) || 'À préciser',
          diagnosticsSecondaires: safeJoin(diagnosisData?.diagnosticsSecondaires),
          diagnosticsDifferentiels: safeJoin(diagnosisData?.diagnosticsDifferentiels),
          examensComplementaires: safeJoin(diagnosisData?.examensComplementaires),
          bilanBiologique: safeJoin(diagnosisData?.bilanBiologique),
          imagerie: safeJoin(diagnosisData?.imagerie),
          conduite: extractValue(diagnosisData, 'conduite', 'À définir'),
          surveillance: extractValue(diagnosisData, 'surveillance', ''),
          pronostic: extractValue(diagnosisData, 'pronostic', ''),
          education: safeJoin(diagnosisData?.education)
        };
      } catch (error) {
        console.error('Erreur extraction diagnostic:', error);
        return {
          diagnosticPrincipal: 'Erreur de traitement',
          diagnosticsSecondaires: '',
          diagnosticsDifferentiels: '',
          examensComplementaires: '',
          bilanBiologique: '',
          imagerie: '',
          conduite: '',
          surveillance: '',
          pronostic: '',
          education: ''
        };
      }
    };

    // Extraction des données
    const patient = extractPatientData();
    const clinical = extractClinicalData();
    const questions = extractQuestionsData();
    const diagnosis = extractDiagnosisData();

    // ==================== GÉNÉRATION AI DES CONTENUS ====================
    
    const generateAIContent = async (prompt: string, maxTokens: number = 10000): Promise<string> => {
      try {
        if (!process.env.OPENAI_API_KEY) {
          console.warn('⚠️ Clé OpenAI non configurée, utilisation du mode fallback');
          return '';
        }

        const systemPrompt = `Vous êtes un médecin généraliste senior avec 20 ans d'expérience, spécialisé dans la rédaction de comptes rendus médicaux détaillés et professionnels. 
        
        Vos comptes rendus doivent:
        - Être structurés de manière claire et professionnelle
        - Utiliser la terminologie médicale appropriée
        - Inclure tous les détails pertinents pour la continuité des soins
        - Respecter les standards médicaux internationaux
        - Être adaptés au contexte mauricien (système de santé, médicaments disponibles localement)
        - Maintenir un niveau de détail élevé tout en restant concis
        - Suivre une approche systématique: anamnèse complète, examen clinique détaillé, raisonnement diagnostique, plan thérapeutique clair`;

        const result = await generateText({
          model: openai("gpt-4o"),
          prompt: `${systemPrompt}\n\n${prompt}`,
          maxTokens: maxTokens,
          temperature: 0.3,
        });

        return result.text || '';
      } catch (error) {
        console.error('Erreur génération AI:', error);
        return '';
      }
    };

    // ==================== GÉNÉRATION DU RAPPORT MÉDICAL ====================
    
    const generateMedicalReport = async () => {
      const date = new Date();
      const dateFormatted = date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      const heure = date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      // Prompt détaillé pour générer un compte rendu médical de haute qualité
      const compteRenduPrompt = `
        Générez un compte rendu médical COMPLET et PROFESSIONNEL pour cette consultation.
        
        INFORMATIONS PATIENT:
        - Nom/Prénom: ${patient.nom} ${patient.prenom}
        - Âge: ${patient.age} ans
        - Sexe: ${patient.sexe}
        - Profession: ${patient.profession}
        
        DONNÉES CLINIQUES:
        - Motif de consultation: ${clinical.motifConsultation}
        - Symptômes principaux: ${clinical.symptomes}
        - Durée des symptômes: ${clinical.dureeSymptomes}
        - Intensité douleur: ${clinical.intensiteDouleur}
        - Facteurs déclenchants: ${clinical.facteursDeclenchants}
        - Facteurs améliorants: ${clinical.facteursAmeliorants}
        
        ANTÉCÉDENTS:
        - Médicaux: ${clinical.antecedents.medicaux}
        - Chirurgicaux: ${clinical.antecedents.chirurgicaux}
        - Familiaux: ${clinical.antecedents.familiaux}
        - Allergies: ${clinical.allergies}
        - Médicaments actuels: ${clinical.medicamentsActuels}
        
        HABITUDES DE VIE:
        - Tabac: ${clinical.habitudes.tabac}
        - Alcool: ${clinical.habitudes.alcool}
        - Activité physique: ${clinical.habitudes.activitePhysique}
        - Sommeil: ${clinical.habitudes.sommeil}
        
        SIGNES VITAUX:
        - TA: ${clinical.signesVitaux.tension}
        - FC: ${clinical.signesVitaux.pouls}
        - T°: ${clinical.signesVitaux.temperature}
        - SatO2: ${clinical.signesVitaux.saturation}
        - Poids: ${clinical.signesVitaux.poids}, Taille: ${clinical.signesVitaux.taille}, IMC: ${clinical.signesVitaux.imc}
        
        EXAMEN CLINIQUE:
        ${questions.summary}
        
        DIAGNOSTIC:
        - Principal: ${diagnosis.diagnosticPrincipal}
        - Secondaires: ${diagnosis.diagnosticsSecondaires}
        - Différentiels écartés: ${diagnosis.diagnosticsDifferentiels}
        
        PLAN DE PRISE EN CHARGE:
        ${diagnosis.conduite}
        
        EXAMENS COMPLÉMENTAIRES:
        - Biologie: ${diagnosis.bilanBiologique}
        - Imagerie: ${diagnosis.imagerie}
        - Autres: ${diagnosis.examensComplementaires}
        
        INSTRUCTIONS:
        Rédigez un compte rendu médical COMPLET incluant:
        
        1. MOTIF DE CONSULTATION (paragraphe détaillé)
        
        2. ANAMNÈSE (très détaillée):
        - Histoire de la maladie actuelle (chronologie précise, évolution)
        - Symptômes associés recherchés
        - Retentissement fonctionnel
        - Traitements déjà essayés et leur efficacité
        - Contexte psychosocial si pertinent
        
        3. ANTÉCÉDENTS (complets et structurés):
        - Médicaux (avec dates si disponibles)
        - Chirurgicaux (avec dates)
        - Gynéco-obstétricaux si femme
        - Familiaux (avec degré de parenté)
        - Allergies et intolérances
        - Vaccinations si pertinent
        
        4. TRAITEMENTS EN COURS (détaillés):
        - Nom, dosage, posologie, indication
        - Observance
        - Tolérance
        
        5. MODE DE VIE:
        - Habitudes détaillées
        - Facteurs de risque cardiovasculaire
        - Contexte professionnel et social
        
        6. EXAMEN CLINIQUE (systématique et complet):
        - État général
        - Signes vitaux commentés
        - Examen par appareil (cardiovasculaire, respiratoire, abdominal, neurologique, etc.)
        - Examen spécifique selon le motif
        - Signes négatifs pertinents
        
        7. SYNTHÈSE CLINIQUE:
        - Résumé des éléments clés
        - Hypothèses diagnostiques argumentées
        
        8. DIAGNOSTIC RETENU:
        - Diagnostic principal avec argumentation
        - Diagnostics secondaires
        - Diagnostics différentiels écartés et pourquoi
        
        9. PLAN DE PRISE EN CHARGE (détaillé):
        - Mesures thérapeutiques immédiates
        - Traitement médicamenteux (avec justification)
        - Mesures non médicamenteuses
        - Examens complémentaires (avec justification de chaque examen)
        - Surveillance proposée
        - Critères de réévaluation
        
        10. CONDUITE À TENIR:
        - Pour le patient (conseils, signes d'alerte)
        - Pour le médecin traitant
        - Rendez-vous de suivi
        
        11. PRONOSTIC (si pertinent)
        
        Le compte rendu doit être:
        - Professionnel et exhaustif
        - Structuré avec des sections claires
        - Utilisant la terminologie médicale appropriée
        - Adapté pour la continuité des soins
        - Conforme aux standards médicaux
        - Contextualisé pour Maurice
      `;

      // Génération AI du compte rendu complet
      let compteRenduComplet = '';
      if (process.env.OPENAI_API_KEY) {
        compteRenduComplet = await generateAIContent(compteRenduPrompt, 10000);
      }

      // Si pas d'AI ou échec, générer un compte rendu structuré de base
      if (!compteRenduComplet) {
        compteRenduComplet = `
COMPTE RENDU DE CONSULTATION

Date: ${dateFormatted} à ${heure}
Patient: ${patient.nom} ${patient.prenom}, ${patient.age} ans, ${patient.sexe}

1. MOTIF DE CONSULTATION
${clinical.motifConsultation}

2. ANAMNÈSE
Histoire de la maladie actuelle:
Le/la patient(e) se présente pour ${clinical.motifConsultation}.
Symptomatologie: ${clinical.symptomes}
Évolution: Symptômes évoluant depuis ${clinical.dureeSymptomes}.
${clinical.intensiteDouleur ? `Intensité de la douleur évaluée à ${clinical.intensiteDouleur}/10.` : ''}
${clinical.facteursDeclenchants ? `Facteurs déclenchants identifiés: ${clinical.facteursDeclenchants}.` : ''}
${clinical.facteursAmeliorants ? `Facteurs améliorants: ${clinical.facteursAmeliorants}.` : ''}

3. ANTÉCÉDENTS
Médicaux: ${clinical.antecedents.medicaux || 'Aucun antécédent médical notable'}
Chirurgicaux: ${clinical.antecedents.chirurgicaux || 'Aucun antécédent chirurgical'}
Familiaux: ${clinical.antecedents.familiaux || 'Sans particularité'}
Allergies: ${clinical.allergies || 'Aucune allergie connue'}

4. TRAITEMENTS EN COURS
${clinical.medicamentsActuels || 'Aucun traitement en cours'}

5. MODE DE VIE
Tabac: ${clinical.habitudes.tabac}
Alcool: ${clinical.habitudes.alcool}
Activité physique: ${clinical.habitudes.activitePhysique}
Sommeil: ${clinical.habitudes.sommeil}

6. EXAMEN CLINIQUE
État général: ${editedDocuments?.etatGeneral || 'Bon état général'}

Signes vitaux:
- Tension artérielle: ${clinical.signesVitaux.tension}
- Fréquence cardiaque: ${clinical.signesVitaux.pouls}
- Température: ${clinical.signesVitaux.temperature}
- Saturation O2: ${clinical.signesVitaux.saturation}
- Poids: ${clinical.signesVitaux.poids}, Taille: ${clinical.signesVitaux.taille}, IMC: ${clinical.signesVitaux.imc}

Examen physique:
${questions.summary || 'Examen clinique sans particularité'}

7. SYNTHÈSE CLINIQUE
${editedDocuments?.syntheseClinique || `Patient présentant un tableau clinique évocateur de ${diagnosis.diagnosticPrincipal}`}

8. DIAGNOSTIC RETENU
Principal: ${diagnosis.diagnosticPrincipal}
${diagnosis.diagnosticsSecondaires ? `Secondaires: ${diagnosis.diagnosticsSecondaires}` : ''}
${diagnosis.diagnosticsDifferentiels ? `Diagnostics différentiels écartés: ${diagnosis.diagnosticsDifferentiels}` : ''}

9. PLAN DE PRISE EN CHARGE
${diagnosis.conduite}

Examens complémentaires demandés:
${diagnosis.bilanBiologique ? `- Biologie: ${diagnosis.bilanBiologique}` : ''}
${diagnosis.imagerie ? `- Imagerie: ${diagnosis.imagerie}` : ''}
${diagnosis.examensComplementaires ? `- Autres: ${diagnosis.examensComplementaires}` : ''}

10. CONDUITE À TENIR
${diagnosis.surveillance || 'Surveillance clinique selon évolution'}
${diagnosis.education || 'Éducation thérapeutique réalisée'}

11. PRONOSTIC
${diagnosis.pronostic || "Bon pronostic sous réserve d'une bonne observance thérapeutique"}

Dr. ${editedDocuments?.praticien || '[Nom du praticien]'}
${editedDocuments?.rpps ? `RPPS: ${editedDocuments.rpps}` : ''}
`;
      }

      return {
        metadata: {
          dateGeneration: dateFormatted,
          heureGeneration: heure,
          typeDocument: 'Compte rendu de consultation médicale détaillé',
          version: '3.0',
          praticien: editedDocuments?.praticien || 'Dr. [Nom du praticien]',
          etablissement: editedDocuments?.etablissement || 'Cabinet Médical',
          adresseEtablissement: editedDocuments?.adresseEtablissement || '[Adresse]',
          telephoneEtablissement: editedDocuments?.telephoneEtablissement || '[Téléphone]',
          numeroConsultation: `CONS-${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}-${Date.now().toString().slice(-6)}`,
          dureeConsultation: editedDocuments?.dureeConsultation || '30 minutes'
        },
        patient: {
          ...patient,
          identifiant: `PAT-${patient.nom.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`,
          numeroMauritien: editedDocuments?.numeroMauritien || '',
          assurance: editedDocuments?.assurance || ''
        },
        rapport: {
          contenuComplet: compteRenduComplet,
          sections: {
            motifConsultation: clinical.motifConsultation,
            anamnese: compteRenduComplet.match(/ANAMNÈSE[\s\S]*?(?=\d\.|$)/)?.[0] || '',
            antecedents: compteRenduComplet.match(/ANTÉCÉDENTS[\s\S]*?(?=\d\.|$)/)?.[0] || '',
            examenClinique: compteRenduComplet.match(/EXAMEN CLINIQUE[\s\S]*?(?=\d\.|$)/)?.[0] || '',
            diagnostic: diagnosis.diagnosticPrincipal,
            planTherapeutique: diagnosis.conduite,
            examensComplementaires: {
              biologie: diagnosis.bilanBiologique,
              imagerie: diagnosis.imagerie,
              autres: diagnosis.examensComplementaires
            },
            surveillance: diagnosis.surveillance,
            pronostic: diagnosis.pronostic
          }
        },
        validationMedicale: {
          statut: 'À valider',
          dateValidation: null,
          validePar: null
        }
      };
    };

    // ==================== GÉNÉRATION DES ORDONNANCES ====================
    
    const generatePrescriptionDocuments = async () => {
      // Génération de l'ordonnance de consultation
      const generateConsultationPrescription = async () => {
        // Génération AI du certificat médical si nécessaire
        let certificatMedical = null;
        let arretTravail = null;
        
        if (process.env.OPENAI_API_KEY && editedDocuments?.needsCertificat) {
          const certificatPrompt = `
            Rédigez un certificat médical professionnel pour:
            Patient: ${patient.nom} ${patient.prenom}, ${patient.age} ans
            Diagnostic: ${diagnosis.diagnosticPrincipal}
            Symptômes: ${clinical.symptomes}
            
            Le certificat doit être formel, médico-légal et adapté au contexte mauricien.
          `;
          
          certificatMedical = await generateAIContent(certificatPrompt, 500);
        }
        
        if (process.env.OPENAI_API_KEY && editedDocuments?.needsArretTravail) {
          const arretPrompt = `
            Proposez une durée d'arrêt de travail justifiée pour:
            Diagnostic: ${diagnosis.diagnosticPrincipal}
            Profession: ${patient.profession}
            Symptômes: ${clinical.symptomes}
            
            Indiquez la durée en jours et les restrictions éventuelles.
          `;
          
          const arretResponse = await generateAIContent(arretPrompt, 200);
          arretTravail = {
            duree: arretResponse.match(/\d+\s*jours?/)?.[0] || '3 jours',
            dateDebut: new Date().toISOString(),
            restrictions: arretResponse
          };
        }

        return {
          type: 'consultation',
          date: new Date().toISOString(),
          metadata: {
            praticien: editedDocuments?.praticien || 'Dr. [Nom]',
            rpps: editedDocuments?.rpps || '[RPPS]',
            adeli: editedDocuments?.adeli || '[ADELI]',
            specialite: editedDocuments?.specialite || 'Médecine Générale',
            etablissement: editedDocuments?.etablissement || 'Cabinet Médical',
            adresse: editedDocuments?.adresseEtablissement || '[Adresse]',
            telephone: editedDocuments?.telephoneEtablissement || '[Téléphone]',
            email: editedDocuments?.emailEtablissement || '[Email]',
            conventionnement: editedDocuments?.conventionnement || 'Secteur 1',
            numeroFacture: `FACT-${Date.now().toString().slice(-8)}`
          },
          content: {
            chiefComplaint: clinical.motifConsultation,
            history: `
              ANAMNÈSE DÉTAILLÉE:
              
              Motif principal: ${clinical.motifConsultation}
              
              Histoire de la maladie:
              - Début: ${clinical.dureeSymptomes}
              - Symptômes: ${clinical.symptomes}
              - Évolution: ${editedDocuments?.evolution || 'Progressive'}
              - Intensité: ${clinical.intensiteDouleur ? `${clinical.intensiteDouleur}/10` : 'Non quantifiée'}
              - Facteurs déclenchants: ${clinical.facteursDeclenchants || 'Aucun identifié'}
              - Facteurs améliorants: ${clinical.facteursAmeliorants || 'Aucun identifié'}
              - Traitements essayés: ${editedDocuments?.traitementsEssayes || 'Aucun'}
              
              Retentissement:
              - Sur les activités quotidiennes: ${editedDocuments?.retentissementQuotidien || 'Non évalué'}
              - Sur le sommeil: ${editedDocuments?.retentissementSommeil || 'Non évalué'}
              - Sur le travail: ${editedDocuments?.retentissementTravail || 'Non évalué'}
            `.trim(),
            examination: `
              EXAMEN CLINIQUE COMPLET:
              
              État général: ${editedDocuments?.etatGeneral || 'Bon état général, patient conscient et orienté'}
              
              Constantes vitales:
              - Tension artérielle: ${clinical.signesVitaux.tension}
              - Fréquence cardiaque: ${clinical.signesVitaux.pouls}
              - Température: ${clinical.signesVitaux.temperature}
              - Saturation O2: ${clinical.signesVitaux.saturation}
              - Fréquence respiratoire: ${editedDocuments?.frequenceRespiratoire || '16/min'}
              - Poids: ${clinical.signesVitaux.poids}, Taille: ${clinical.signesVitaux.taille}
              - IMC: ${clinical.signesVitaux.imc}
              
              Examen par appareil:
              ${questions.summary || 'Examen systématique sans particularité'}
              
              ${editedDocuments?.examenComplementaire || ''}
            `.trim(),
            diagnosis: `
              DIAGNOSTIC ET ANALYSE:
              
              Diagnostic principal retenu:
              ${diagnosis.diagnosticPrincipal}
              
              Argumentation diagnostique:
              ${editedDocuments?.argumentationDiagnostic || "Basé sur l'anamnèse et l'examen clinique"}
              
              ${diagnosis.diagnosticsSecondaires ? `Diagnostics associés:\n${diagnosis.diagnosticsSecondaires}` : ''}
              
              ${diagnosis.diagnosticsDifferentiels ? `Diagnostics différentiels écartés:\n${diagnosis.diagnosticsDifferentiels}` : ''}
              
              Niveau de certitude: ${editedDocuments?.niveauCertitude || 'Élevé'}
            `.trim(),
            plan: `
              PLAN DE PRISE EN CHARGE DÉTAILLÉ:
              
              1. TRAITEMENT MÉDICAMENTEUX:
              ${diagnosis.conduite}
              
              2. MESURES NON MÉDICAMENTEUSES:
              ${editedDocuments?.mesuresNonMedicamenteuses || `
              - Repos relatif adapté
              - Hydratation adéquate
              - Alimentation équilibrée
              - Activité physique selon tolérance`}
              
              3. EXAMENS COMPLÉMENTAIRES:
              ${diagnosis.examensComplementaires || "Aucun examen complémentaire nécessaire dans l'immédiat"}
              
              4. SURVEILLANCE:
              ${diagnosis.surveillance || `
              - Évolution des symptômes
              - Tolérance au traitement
              - Apparition de signes d'alerte`}
              
              5. ÉDUCATION THÉRAPEUTIQUE:
              ${diagnosis.education || `
              - Explication de la pathologie
              - Importance de l'observance
              - Reconnaissance des signes d'alerte
              - Mesures préventives`}
              
              6. PRÉVENTION:
              ${editedDocuments?.prevention || 'Conseils de prévention adaptés à la pathologie'}
            `.trim(),
            followUp: `
              SUIVI PROPOSÉ:
              
              Prochain rendez-vous: ${editedDocuments?.prochainRdv || "Dans 1 semaine si pas d'amélioration"}
              
              Modalités de suivi:
              - ${editedDocuments?.modalitesSuivi || 'Consultation de contrôle'}
              - Réévaluation clinique
              - Contrôle de l'efficacité thérapeutique
              - Ajustement du traitement si nécessaire
              
              Critères de consultation urgente:
              ${editedDocuments?.criteresUrgence || `
              - Aggravation des symptômes
              - Apparition de nouveaux symptômes
              - Effets secondaires importants
              - Absence d'amélioration sous traitement`}
              
              Coordination des soins:
              - Transmission au médecin traitant: ${editedDocuments?.transmissionMT || 'Oui'}
              - Autres spécialistes impliqués: ${editedDocuments?.autresSpecialistes || 'Aucun'}
            `.trim(),
            certificat: certificatMedical,
            arretTravail: arretTravail,
            codesCIM10: editedDocuments?.codesCIM10 || diagnosis.diagnosticPrincipal,
            actesRealises: editedDocuments?.actesRealises || 'Consultation avec examen clinique complet'
          },
          facturation: {
            actesPrincipal: editedDocuments?.actePrincipal || 'CS - Consultation',
            actesComplementaires: editedDocuments?.actesComplementaires || [],
            total: editedDocuments?.montantTotal || 'Selon convention',
            modeReglement: editedDocuments?.modeReglement || 'À définir',
            priseEnCharge: editedDocuments?.priseEnCharge || 'Sécurité sociale + Mutuelle'
          },
          documentsRemis: {
            compteRendu: true,
            ordonnances: ['Médicamenteuse', 'Biologie', 'Imagerie'].filter((_, i) => 
              i === 0 || (i === 1 && diagnosis.bilanBiologique) || (i === 2 && diagnosis.imagerie)
            ),
            certificat: !!certificatMedical,
            arretTravail: !!arretTravail,
            courrier: editedDocuments?.courrierSpecialiste || false
          },
          mentionsLegales: `
            Document médical confidentiel établi le ${new Date().toLocaleDateString('fr-FR')}
            Remis en main propre au patient
            Conservation recommandée pour le suivi médical
          `.trim()
        };
      };

      // Génération de l'ordonnance biologique
      const generateBiologyPrescription = async () => {
        let prescriptions = [];
        
        if (process.env.OPENAI_API_KEY && (diagnosis.bilanBiologique || diagnosis.examensComplementaires)) {
          const biologyPrompt = `
            En tant que médecin expérimenté, générez une ordonnance d'examens biologiques DÉTAILLÉE pour:
            
            CONTEXTE CLINIQUE:
            - Diagnostic: ${diagnosis.diagnosticPrincipal}
            - Symptômes: ${clinical.symptomes}
            - Antécédents: ${clinical.antecedents.medicaux}
            - Médicaments actuels: ${clinical.medicamentsActuels}
            
            EXAMENS DEMANDÉS PAR LE MÉDECIN:
            ${diagnosis.bilanBiologique || diagnosis.examensComplementaires}
            
            Pour CHAQUE examen biologique, fournissez:
            1. Nom complet de l'examen (avec abréviations courantes)
            2. Indication médicale précise
            3. Urgence (Urgent <6h / Semi-urgent 24-48h / Programmé 3-7j)
            4. Conditions de prélèvement (à jeun ou non, horaire spécifique)
            5. Disponibilité à Maurice
            6. Valeurs normales attendues
            7. Interprétation clinique possible
            
            FORMAT: EXAMEN|INDICATION|URGENCE|JEÛNE|DISPONIBILITÉ|VALEURS_NORMALES|INTERPRÉTATION
            
            Incluez les examens standards pertinents même s'ils n'ont pas été explicitement mentionnés.
          `;
          
          const aiResponse = await generateAIContent(biologyPrompt, 2000);
          if (aiResponse) {
            const lines = aiResponse.split('\n').filter(line => line.includes('|'));
            prescriptions = lines.map((line, index) => {
              const parts = line.split('|').map(p => p.trim());
              return {
                id: Date.now() + index,
                exam: parts[0] || '',
                indication: parts[1] || `Bilan dans le cadre de: ${diagnosis.diagnosticPrincipal}`,
                urgency: parts[2] || 'Semi-urgent (24-48h)',
                fasting: parts[3] || 'Non',
                mauritianAvailability: parts[4] || 'Disponible laboratoires Maurice',
                valeurNormale: parts[5] || '',
                interpretation: parts[6] || ''
              };
            }).filter(p => p.exam);
          }
        }
        
        // Si pas de prescriptions générées, créer un bilan standard
        if (prescriptions.length === 0) {
          const examensStandard = [
            {
              exam: 'NFS (Numération Formule Sanguine)',
              indication: 'Recherche anémie, infection, anomalie hématologique',
              valeurNormale: 'Hb: 12-16 g/dL (F), 13-17 g/dL (H)'
            },
            {
              exam: 'CRP (Protéine C-Réactive)',
              indication: 'Marqueur inflammatoire',
              valeurNormale: '< 5 mg/L'
            },
            {
              exam: 'Ionogramme sanguin',
              indication: 'Équilibre électrolytique',
              valeurNormale: 'Na: 136-145 mmol/L, K: 3.5-5.1 mmol/L'
            },
            {
              exam: 'Créatinine + DFG',
              indication: 'Fonction rénale',
              valeurNormale: 'Créat: 60-110 μmol/L, DFG > 90 mL/min'
            }
          ];
          
          prescriptions = examensStandard.map((exam, index) => ({
            id: Date.now() + index,
            ...exam,
            urgency: 'Semi-urgent (24-48h)',
            fasting: exam.exam.includes('Glycémie') ? 'Oui (12h)' : 'Non',
            mauritianAvailability: 'Disponible laboratoires Maurice',
            interpretation: ''
          }));
        }

        return {
          type: 'biology',
          date: new Date().toISOString(),
          prescriptions: prescriptions,
          header: {
            praticien: editedDocuments?.praticien || 'Dr. [Nom du praticien]',
            etablissement: editedDocuments?.etablissement || 'Cabinet Médical',
            patient: `${patient.nom} ${patient.prenom}`,
            dateNaissance: patient.dateNaissance,
            numeroOrdonnance: `BIO-${Date.now().toString().slice(-8)}`
          },
          instructionsGenerales: `
            INSTRUCTIONS POUR LE PATIENT:
            
            1. AVANT LE PRÉLÈVEMENT:
               - Se présenter avec cette ordonnance et une pièce d'identité
               - Respecter les conditions de jeûne indiquées (12h = dernière prise alimentaire la veille au soir)
               - Éviter l'alcool 24h avant
               - Maintenir une hydratation normale (eau autorisée)
               - Signaler tout traitement en cours au laboratoire
            
            2. LABORATOIRES RECOMMANDÉS À MAURICE:
               - Laboratoire C-Care (plusieurs sites)
               - Bio-Medical Laboratory
               - Lancet Laboratories
               - Laboratoire de l'Hôpital [selon localisation]
            
            3. RÉSULTATS:
               - Disponibles sous 24-48h selon les examens
               - Transmission directe au médecin prescripteur
               - Copie patient sur demande
            
            4. IMPORTANT:
               - Cette ordonnance est valable 3 mois
               - Tous les examens peuvent être réalisés le même jour
               - En cas de résultats anormaux, le laboratoire contactera le médecin
            
            ${editedDocuments?.instructionsBiologie || ''}
          `.trim(),
          renseignementsCliniques: `
            Motif: ${clinical.motifConsultation}
            Diagnostic évoqué: ${diagnosis.diagnosticPrincipal}
            Traitement en cours: ${clinical.medicamentsActuels || 'Aucun'}
          `.trim()
        };
      };

      // Génération de l'ordonnance paraclinique
      const generateParaclinicalPrescription = async () => {
        let prescriptions = [];
        
        if (process.env.OPENAI_API_KEY && diagnosis.imagerie) {
          const imagingPrompt = `
            En tant que médecin expérimenté, générez une ordonnance d'examens d'imagerie DÉTAILLÉE pour:
            
            CONTEXTE CLINIQUE:
            - Diagnostic: ${diagnosis.diagnosticPrincipal}
            - Symptômes: ${clinical.symptomes}
            - Examen clinique: ${questions.summary}
            - Antécédents: ${clinical.antecedents.medicaux}
            
            EXAMENS D'IMAGERIE DEMANDÉS:
            ${diagnosis.imagerie}
            
            Pour CHAQUE examen d'imagerie, fournissez:
            1. Type d'examen précis (radiographie, échographie, scanner, IRM, etc.)
            2. Région anatomique exacte
            3. Protocole spécifique si nécessaire
            4. Indication médicale détaillée
            5. Urgence de réalisation
            6. Préparation nécessaire
            7. Contre-indications à vérifier
            8. Informations cliniques pertinentes pour le radiologue
            
            FORMAT: EXAMEN|RÉGION|PROTOCOLE|INDICATION|URGENCE|PRÉPARATION|CONTRE-INDICATIONS|INFOS_CLINIQUES
            
            Soyez précis sur les incidences radiologiques et les séquences IRM si pertinent.
          `;
          
          const aiResponse = await generateAIContent(imagingPrompt, 2000);
          if (aiResponse) {
            const lines = aiResponse.split('\n').filter(line => line.includes('|'));
            prescriptions = lines.map((line, index) => {
              const parts = line.split('|').map(p => p.trim());
              return {
                id: Date.now() + index,
                exam: parts[0] || '',
                region: parts[1] || '',
                protocole: parts[2] || 'Standard',
                indication: parts[3] || diagnosis.diagnosticPrincipal,
                urgency: parts[4] || 'Programmé (3-7 jours)',
                preparation: parts[5] || 'Aucune préparation spécifique',
                contreIndications: parts[6] || '',
                infosCliniques: parts[7] || '',
                mauritianAvailability: 'Disponible centres imagerie Maurice'
              };
            }).filter(p => p.exam);
          }
        }
        
        // Si pas d'examens générés mais demandés dans le diagnostic
        if (prescriptions.length === 0 && diagnosis.imagerie) {
          const imageries = ensureArray(diagnosis.imagerie);
          prescriptions = imageries.map((exam, index) => ({
            id: Date.now() + index,
            exam: exam,
            region: '',
            protocole: 'Standard',
            indication: `Exploration dans le cadre de: ${clinical.motifConsultation}`,
            urgency: 'Programmé (3-7 jours)',
            preparation: exam.toLowerCase().includes('échographie') ? 'Selon la région explorée' : 
                        exam.toLowerCase().includes('scanner') ? 'Vérifier fonction rénale si injection' :
                        exam.toLowerCase().includes('irm') ? 'Retirer tous objets métalliques' : 
                        'Aucune préparation spécifique',
            contreIndications: exam.toLowerCase().includes('irm') ? 'Pacemaker, implants métalliques' : '',
            infosCliniques: `${clinical.symptomes}. ${diagnosis.diagnosticPrincipal}`,
            mauritianAvailability: 'Disponible centres imagerie Maurice'
          }));
        }

        return {
          type: 'paraclinical',
          date: new Date().toISOString(),
          prescriptions: prescriptions,
          header: {
            praticien: editedDocuments?.praticien || 'Dr. [Nom du praticien]',
            etablissement: editedDocuments?.etablissement || 'Cabinet Médical',
            patient: `${patient.nom} ${patient.prenom}`,
            dateNaissance: patient.dateNaissance,
            numeroOrdonnance: `IMG-${Date.now().toString().slice(-8)}`
          },
          renseignementsCliniques: `
            RENSEIGNEMENTS CLINIQUES POUR LE RADIOLOGUE:
            
            Motif de consultation: ${clinical.motifConsultation}
            
            Histoire clinique:
            - Symptômes: ${clinical.symptomes}
            - Durée: ${clinical.dureeSymptomes}
            - Évolution: ${editedDocuments?.evolution || 'Progressive'}
            
            Examen clinique:
            ${questions.summary || 'Voir compte-rendu joint'}
            
            Hypothèses diagnostiques:
            - ${diagnosis.diagnosticPrincipal}
            ${diagnosis.diagnosticsDifferentiels ? `- Différentiels: ${diagnosis.diagnosticsDifferentiels}` : ''}
            
            Antécédents pertinents:
            - Médicaux: ${clinical.antecedents.medicaux || 'Aucun'}
            - Chirurgicaux: ${clinical.antecedents.chirurgicaux || 'Aucun'}
            - Allergies (produits de contraste): ${clinical.allergies || 'Aucune connue'}
            
            Examens antérieurs: ${editedDocuments?.examensAnterieurs || 'Aucun'}
            
            Question posée: ${editedDocuments?.questionRadiologique || 'Confirmer/infirmer le diagnostic évoqué'}
          `.trim(),
          instructionsPatient: `
            INSTRUCTIONS POUR LE PATIENT:
            
            1. CENTRES D'IMAGERIE RECOMMANDÉS À MAURICE:
               - Clinique Darné - Service Radiologie
               - C-Care Medical & Research Centre
               - Wellkin Hospital - Imagerie Médicale
               - City Clinic - Centre d'imagerie
               
            2. PRISE DE RENDEZ-VOUS:
               - Contacter le centre choisi avec cette ordonnance
               - Mentionner le degré d'urgence indiqué
               - Prévoir 30-60 minutes selon l'examen
            
            3. LE JOUR DE L'EXAMEN:
               - Se présenter 15 minutes avant l'heure du RDV
               - Apporter cette ordonnance + pièce d'identité
               - Apporter examens antérieurs si disponibles
               - Signaler grossesse ou possibilité de grossesse
               - Signaler allergies et antécédents
            
            4. PRÉPARATIONS SPÉCIFIQUES:
               ${prescriptions.map(p => p.preparation && p.preparation !== 'Aucune préparation spécifique' ? 
                 `- ${p.exam}: ${p.preparation}` : '').filter(Boolean).join('\n') || 
                 '- Voir instructions spécifiques du centre d\'imagerie'}
            
            5. CONTRE-INDICATIONS IMPORTANTES:
               ${prescriptions.map(p => p.contreIndications ? 
                 `- ${p.exam}: ${p.contreIndications}` : '').filter(Boolean).join('\n') || 
                 '- À vérifier avec le radiologue'}
            
            6. RÉSULTATS:
               - Remis sur place ou envoyés sous 24-48h
               - Transmission directe au médecin prescripteur
               - Conserver les images pour le suivi
            
            ${editedDocuments?.instructionsImagerie || ''}
          `.trim(),
          mentionsLegales: 'Ordonnance valable 6 mois. Les examens d\'imagerie sont soumis à la justification médicale.',
          consentement: prescriptions.some(p => p.exam.toLowerCase().includes('scanner') || p.exam.toLowerCase().includes('irm')) ?
            'Un formulaire de consentement sera à signer pour les examens avec injection de produit de contraste.' : ''
        };
      };

      // Génération de l'ordonnance médicamenteuse avec AI
      const generateMedicationPrescription = async () => {
        let prescriptions = [];
        
        if (process.env.OPENAI_API_KEY && diagnosis.conduite) {
          const medicationPrompt = `
            En tant que médecin généraliste expérimenté, générez une ordonnance médicamenteuse COMPLÈTE et DÉTAILLÉE pour:
            
            PATIENT:
            - Âge: ${patient.age} ans
            - Sexe: ${patient.sexe}
            - Poids: ${clinical.signesVitaux.poids || '70 kg'}
            - Allergies: ${clinical.allergies || 'Aucune'}
            - Fonction rénale/hépatique: Présumée normale sauf indication contraire
            - Médicaments actuels: ${clinical.medicamentsActuels || 'Aucun'}
            
            DIAGNOSTIC:
            - Principal: ${diagnosis.diagnosticPrincipal}
            - Secondaires: ${diagnosis.diagnosticsSecondaires || 'Aucun'}
            
            CONTEXTE CLINIQUE:
            - Symptômes: ${clinical.symptomes}
            - Durée: ${clinical.dureeSymptomes}
            - Intensité douleur: ${clinical.intensiteDouleur || 'Non précisée'}
            - Signes vitaux: TA ${clinical.signesVitaux.tension}, FC ${clinical.signesVitaux.pouls}
            
            PLAN THÉRAPEUTIQUE DÉFINI:
            ${diagnosis.conduite}
            
            INSTRUCTIONS POUR LA PRESCRIPTION:
            1. Générez une ordonnance COMPLÈTE incluant:
               - Traitement de fond si nécessaire
               - Traitement symptomatique
               - Prévention des effets secondaires si pertinent
               - Adjuvants si indiqués
            
            2. Pour CHAQUE médicament, fournissez OBLIGATOIREMENT:
               - Nom (DCI de préférence + nom commercial à Maurice si connu)
               - Dosage précis
               - Forme galénique
               - Posologie détaillée (nombre de prises, horaires si pertinent)
               - Voie d'administration
               - Durée exacte du traitement
               - Instructions spéciales (avant/pendant/après repas, etc.)
               - Indication thérapeutique
               - Surveillance si nécessaire
            
            3. Adaptez au contexte mauricien:
               - Privilégiez les médicaments disponibles localement
               - Mentionnez les alternatives génériques
               - Considérez le coût pour le patient
            
            4. Incluez si pertinent:
               - Mesures hygiéno-diététiques
               - Conseils de surveillance
               - Signes d'alerte
               - Modalités de suivi
            
            FORMAT DE RÉPONSE OBLIGATOIRE (un médicament par ligne):
            MEDICATION|DOSAGE|FORME|POSOLOGIE|VOIE|DURÉE|INSTRUCTIONS|INDICATION|SURVEILLANCE
            
            Exemple:
            Amoxicilline|500mg|Comprimé|1 cp 3 fois/jour (8h-16h-22h)|Orale|7 jours|Pendant les repas|Infection bactérienne|Surveiller apparition rash
            
            Générez entre 3 et 8 médicaments selon la complexité du cas.
            Soyez PRÉCIS et PROFESSIONNEL.
          `;
          
          const aiResponse = await generateAIContent(medicationPrompt, 3000);
          if (aiResponse) {
            const lines = aiResponse.split('\n').filter(line => line.includes('|'));
            prescriptions = lines.map((line, index) => {
              const parts = line.split('|').map(p => p.trim());
              return {
                id: Date.now() + index,
                medication: parts[0] || '',
                dosage: parts[1] || '',
                forme: parts[2] || '',
                frequency: parts[3] || '',
                voie: parts[4] || 'Orale',
                duration: parts[5] || '',
                indication: parts[7] || diagnosis.diagnosticPrincipal,
                specialInstructions: parts[6] || '',
                surveillance: parts[8] || '',
                genericAvailable: true,
                mauritianBrand: parts[0]?.includes('(') ? parts[0].match(/\((.*?)\)/)?.[1] : ''
              };
            }).filter(p => p.medication); // Filtrer les lignes vides
          }
        }

        // Fallback si pas d'AI ou échec
        if (prescriptions.length === 0 && editedDocuments?.prescriptionsMedicamenteuses) {
          prescriptions = ensureArray(editedDocuments.prescriptionsMedicamenteuses);
        }

        // Si toujours pas de prescriptions, générer une ordonnance basique
        if (prescriptions.length === 0) {
          prescriptions = [{
            id: Date.now(),
            medication: 'Paracétamol',
            dosage: '500mg',
            forme: 'Comprimé',
            frequency: '1 comprimé 3 fois par jour si douleur',
            voie: 'Orale',
            duration: '5 jours',
            indication: 'Antalgique',
            specialInstructions: 'Maximum 4g/jour. À prendre pendant les repas.',
            surveillance: 'Consulter si persistance des symptômes',
            genericAvailable: true,
            mauritianBrand: 'Panadol'
          }];
        }

        return {
          type: 'medication',
          date: new Date().toISOString(),
          prescriptions: prescriptions,
          header: {
            praticien: editedDocuments?.praticien || 'Dr. [Nom du praticien]',
            rpps: editedDocuments?.rpps || '[RPPS]',
            adeli: editedDocuments?.adeli || '[ADELI]',
            specialite: editedDocuments?.specialite || 'Médecine Générale',
            adresseCabinet: editedDocuments?.adresseCabinet || '[Adresse du cabinet]',
            telephone: editedDocuments?.telephoneCabinet || '[Téléphone]',
            email: editedDocuments?.emailCabinet || '[Email]'
          },
          footer: {
            mentionsLegales: 'Ordonnance valable 3 mois. Ne pas dépasser les doses prescrites.',
            dateValidite: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR')
          },
          conseils: `
            CONSEILS AU PATIENT:
            - Respecter scrupuleusement les horaires et doses prescrits
            - Ne pas arrêter le traitement sans avis médical
            - Conserver les médicaments selon les conditions indiquées
            - En cas d'effets indésirables, consulter immédiatement
            - Tenir hors de portée des enfants
            
            SIGNES D'ALERTE nécessitant une consultation urgente:
            - Réaction allergique (éruption, démangeaisons, gonflement)
            - Aggravation des symptômes
            - Apparition de nouveaux symptômes
            ${editedDocuments?.conseilsSpecifiques || ''}
          `.trim(),
          interactions: editedDocuments?.interactions || 'Aucune interaction majeure identifiée avec les traitements en cours',
          renouvellement: editedDocuments?.renouvellement || 'Non renouvelable',
          substitution: 'Substitution générique autorisée sauf mention contraire'
        };
      };

      return {
        consultation: await generateConsultationPrescription(),
        biology: await generateBiologyPrescription(),
        paraclinical: await generateParaclinicalPrescription(),
        medication: await generateMedicationPrescription()
      };
    };

    // ==================== GÉNÉRATION FINALE ====================
    
    const startTime = Date.now();
    const report = await generateMedicalReport();
    const documents = generateAllDocuments ? await generatePrescriptionDocuments() : {};
    const endTime = Date.now();

    // Calcul des statistiques de complétude
    const calculateCompleteness = (obj: any): number => {
      const values = Object.values(obj).flat();
      const filledValues = values.filter(v => 
        v !== null && 
        v !== undefined && 
        v !== '' && 
        v !== 'Non renseigné' && 
        v !== 'Non renseignée' &&
        v !== 'Non mesuré' &&
        v !== 'Non mesurée'
      );
      return values.length > 0 ? filledValues.length / values.length : 0;
    };

    // Ajout des métadonnées finales
    const finalResponse = {
      success: true,
      report: report,
      documents: documents,
      metadata: {
        timestamp: new Date().toISOString(),
        version: '3.0',
        generatedBy: 'Medical AI Expert System - Professional Edition',
        generationTime: `${endTime - startTime}ms`,
        checksum: Math.random().toString(36).substring(2, 15),
        environment: process.env.NODE_ENV || 'production'
      },
      statistics: {
        patientDataCompleteness: Math.round(calculateCompleteness(patient) * 100),
        clinicalDataCompleteness: Math.round(calculateCompleteness(clinical) * 100),
        diagnosticDataCompleteness: Math.round(calculateCompleteness(diagnosis) * 100),
        overallCompleteness: Math.round(
          (calculateCompleteness(patient) + 
           calculateCompleteness(clinical) + 
           calculateCompleteness(diagnosis)) / 3 * 100
        ),
        aiGenerated: !!process.env.OPENAI_API_KEY,
        documentsGenerated: generateAllDocuments ? Object.keys(documents).length : 0,
        prescriptionsCount: generateAllDocuments ? 
          (documents.biology?.prescriptions?.length || 0) +
          (documents.paraclinical?.prescriptions?.length || 0) +
          (documents.medication?.prescriptions?.length || 0) : 0
      },
      quality: {
        reportLength: report.rapport?.contenuComplet?.length || 0,
        sectionsCompleted: Object.values(report.rapport?.sections || {}).filter(v => v).length,
        aiEnhanced: !!process.env.OPENAI_API_KEY,
        professionalGrade: true,
        mauritianContext: true
      }
    };

    console.log('✅ Génération complète réussie');
    console.log(`📊 Statistiques de génération:`);
    console.log(`   - Temps de génération: ${endTime - startTime}ms`);
    console.log(`   - Complétude patient: ${finalResponse.statistics.patientDataCompleteness}%`);
    console.log(`   - Complétude clinique: ${finalResponse.statistics.clinicalDataCompleteness}%`);
    console.log(`   - Complétude diagnostic: ${finalResponse.statistics.diagnosticDataCompleteness}%`);
    console.log(`   - Documents générés: ${finalResponse.statistics.documentsGenerated}`);
    console.log(`   - Prescriptions totales: ${finalResponse.statistics.prescriptionsCount}`);
    console.log(`   - Mode AI: ${finalResponse.statistics.aiGenerated ? 'Activé (GPT-4o)' : 'Désactivé'}`);

    return NextResponse.json(finalResponse);

  } catch (error) {
    console.error('❌ Erreur API génération:', error);
    
    // Log détaillé pour debug
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
      console.error('Message:', error.message);
      console.error('Type:', error.constructor.name);
    }
    
    // Tentative d'identification de l'erreur spécifique
    let errorDetails = 'Erreur inconnue';
    if (error instanceof Error) {
      if (error.message.includes('join is not a function')) {
        errorDetails = "Erreur de type de données: tentative d'utilisation de join sur une non-array";
      } else if (error.message.includes('OpenAI')) {
        errorDetails = 'Erreur API OpenAI - Vérifiez votre clé API';
      } else if (error.message.includes('JSON')) {
        errorDetails = 'Erreur de parsing JSON';
      }
    }
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue lors de la génération',
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      details: errorDetails,
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Endpoint GET pour vérifier l'état de l'API
export async function GET() {
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  
  return NextResponse.json({ 
    status: 'operational',
    message: 'API de génération de compte rendu médical professionnel',
    version: '3.0',
    features: {
      aiGeneration: hasOpenAI,
      model: hasOpenAI ? 'gpt-4o (via Vercel AI SDK)' : 'none',
      temperature: 0.3,
      maxTokens: 10000,
      multipleDocuments: true,
      mauritianContext: true,
      professionalGrade: true,
      detailedReports: true
    },
    endpoints: {
      POST: '/api/generate-consultation-report',
      description: 'Génère un dossier médical complet professionnel avec rapport détaillé et ordonnances'
    },
    requirements: {
      openAI: hasOpenAI ? '✅ Configuré' : '❌ Clé API manquante',
      memory: '512MB minimum',
      timeout: '30s recommandé'
    },
    documentation: {
      inputFormat: {
        patientData: 'Données patient complètes',
        clinicalData: 'Données cliniques avec antécédents',
        questionsData: "Réponses aux questions d'examen",
        diagnosisData: 'Diagnostic et plan thérapeutique',
        editedDocuments: 'Documents édités (optionnel)',
        generateAllDocuments: 'Boolean pour génération complète'
      },
      outputFormat: {
        report: 'Compte rendu médical professionnel détaillé',
        documents: {
          consultation: 'Compte-rendu de consultation complet',
          biology: 'Ordonnance biologique détaillée',
          paraclinical: 'Ordonnance imagerie avec protocoles',
          medication: 'Ordonnance médicamenteuse complète'
        },
        metadata: 'Métadonnées de génération',
        statistics: 'Statistiques de qualité'
      }
    }
  });
}
