// app/api/generate-consultation-report/route.ts - Version corrigée et sécurisée

import { NextRequest } from 'next/server';
import { MauritianDocumentsGenerator } from '@/lib/mauritian-documents-generator';

// ================================
// TYPES TYPESCRIPT
// ================================

interface PatientData {
  id?: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  address?: string;
  phone?: string;
  allergies?: string[] | string;
  weight?: number;
  height?: number;
  medicalHistory?: string[] | string;
  currentMedications?: string;
  currentMedicationsText?: string;
  familyHistory?: string;
  lifeHabits?: {
    smoking?: string;
    alcohol?: string;
    exercise?: string;
    diet?: string;
  };
}

interface ClinicalData {
  chiefComplaint?: string;
  historyOfDisease?: string;
  duration?: string;
  generalCondition?: string;
  bloodPressure?: string;
  heartRate?: number;
  respiratoryRate?: number;
  temperature?: number;
  oxygenSaturation?: number;
  cardiovascularExam?: string;
  respiratoryExam?: string;
  abdominalExam?: string;
  neurologicalExam?: string;
  dermatologicalExam?: string;
}

interface QuestionsData {
  responses?: Record<string, any>;
}

interface DiagnosisData {
  diagnosis?: {
    primary?: {
      condition: string;
      icd10?: string;
      confidence?: number;
      severity?: string;
      rationale?: string;
    };
    differential?: any[];
  };
  primary_diagnosis?: {
    condition: string;
    icd10?: string;
    confidence?: number;
    severity?: string;
    rationale?: string;
  };
  differential_diagnoses?: any[];
  expertAnalysis?: {
    expert_investigations?: {
      immediate_priority?: any[];
    };
    expert_therapeutics?: {
      primary_treatments?: any[];
      emergency_management?: any[];
      lifestyle_modifications?: any[];
      patient_education?: any[];
      follow_up?: {
        timeline?: string;
        monitoring_parameters?: string;
      };
    };
  };
  prognosis?: string;
}

interface DoctorInfo {
  fullName: string;
  specialty: string;
  address: string;
  city: string;
  phone: string;
  email: string;
  registrationNumber: string;
}

interface RequestBody {
  patientData: PatientData;
  clinicalData?: ClinicalData;
  questionsData?: QuestionsData;
  diagnosisData: DiagnosisData;
}

// ================================
// CONSTANTES
// ================================

const MEDICAL_DEFAULTS = {
  DEFAULT_ALLERGIES: 'Aucune allergie connue',
  DEFAULT_MEDICAL_HISTORY: 'Aucun antécédent particulier',
  DEFAULT_FOLLOW_UP: 'Consultation de réévaluation si pas d\'amélioration sous 48-72h',
  DEFAULT_VITAL_SIGNS: 'Signes vitaux stables',
  DEFAULT_SYMPTOMS: 'Symptômes à documenter',
  MAURITIAN_RECOMMENDATIONS: [
    'Hydratation renforcée (climat tropical Maurice)',
    'Protection anti-moustiques (dengue/chikungunya endémiques)',
    'Éviter exposition solaire aux heures chaudes'
  ]
} as const;

const TIMEOUT_MS = 30000; // 30 secondes

// ================================
// VALIDATION
// ================================

function validateRequestBody(body: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validation structure de base
  if (!body || typeof body !== 'object') {
    return { isValid: false, errors: ['Corps de requête invalide'] };
  }

  const { patientData, diagnosisData } = body;

  // Validation patientData
  if (!patientData || typeof patientData !== 'object') {
    errors.push('patientData est requis et doit être un objet');
  } else {
    if (!patientData.firstName || typeof patientData.firstName !== 'string' || !patientData.firstName.trim()) {
      errors.push('patientData.firstName est requis');
    }
    if (!patientData.lastName || typeof patientData.lastName !== 'string' || !patientData.lastName.trim()) {
      errors.push('patientData.lastName est requis');
    }
    if (!patientData.age || typeof patientData.age !== 'number' || patientData.age <= 0 || patientData.age > 150) {
      errors.push('patientData.age doit être un nombre valide entre 1 et 150');
    }
  }

  // Validation diagnosisData
  if (!diagnosisData || typeof diagnosisData !== 'object') {
    errors.push('diagnosisData est requis et doit être un objet');
  }

  return { isValid: errors.length === 0, errors };
}

function validateDoctorInfo(): DoctorInfo | null {
  const requiredEnvVars = [
    'DOCTOR_FULL_NAME',
    'DOCTOR_SPECIALTY', 
    'DOCTOR_ADDRESS',
    'DOCTOR_REGISTRATION'
  ];

  const missing = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('Variables d\'environnement manquantes:', missing);
    return null;
  }

  return {
    fullName: process.env.DOCTOR_FULL_NAME!,
    specialty: process.env.DOCTOR_SPECIALTY!,
    address: process.env.DOCTOR_ADDRESS!,
    city: process.env.DOCTOR_CITY || 'Port-Louis, Maurice',
    phone: process.env.DOCTOR_PHONE || '+230 xxx xxx xxx',
    email: process.env.DOCTOR_EMAIL || 'contact@cabinet.mu',
    registrationNumber: process.env.DOCTOR_REGISTRATION!
  };
}

// ================================
// UTILITAIRES SÉCURISÉS
// ================================

function safeString(value: any, defaultValue = ''): string {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.join(', ');
  return defaultValue;
}

function safeNumber(value: any, defaultValue = 0): number {
  const num = Number(value);
  return isFinite(num) && num > 0 ? num : defaultValue;
}

function safeArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function calculateBMI(weight?: number, height?: number): string | null {
  const safeWeight = safeNumber(weight);
  const safeHeight = safeNumber(height);
  
  if (!safeWeight || !safeHeight) return null;
  
  try {
    const bmi = safeWeight / ((safeHeight / 100) ** 2);
    return isFinite(bmi) ? bmi.toFixed(1) : null;
  } catch {
    return null;
  }
}

function safeExtractFromResponses(questionsData: QuestionsData, keywords: string[]): string[] {
  if (!questionsData?.responses || typeof questionsData.responses !== 'object') {
    return [];
  }

  const results: string[] = [];
  
  try {
    Object.entries(questionsData.responses).forEach(([question, answer]) => {
      if (typeof question === 'string' && typeof answer === 'string' && answer.trim()) {
        const lowerQuestion = question.toLowerCase();
        if (keywords.some(keyword => lowerQuestion.includes(keyword))) {
          results.push(answer.trim());
        }
      }
    });
  } catch (error) {
    console.error('Erreur extraction responses:', error);
  }

  return results;
}

// ================================
// EXTRACTEURS DE DONNÉES
// ================================

function extractSymptomsArray(questionsData?: QuestionsData, clinicalData?: ClinicalData): string[] {
  const symptoms = safeExtractFromResponses(questionsData || {}, [
    'symptôme', 'ressent', 'douleur', 'mal', 'problème'
  ]);
  
  // Ajouter le motif principal si disponible
  const chiefComplaint = safeString(clinicalData?.chiefComplaint);
  if (chiefComplaint && !symptoms.includes(chiefComplaint)) {
    symptoms.unshift(chiefComplaint);
  }
  
  return symptoms.length > 0 ? symptoms : [MEDICAL_DEFAULTS.DEFAULT_SYMPTOMS];
}

function extractHistoryFromQuestionsData(questionsData?: QuestionsData): string {
  const historyParts = safeExtractFromResponses(questionsData || {}, [
    'symptôme', 'douleur', 'évolution', 'histoire', 'début'
  ]);
  
  return historyParts.length > 0 
    ? historyParts.join('\n') 
    : 'Histoire documentée via questionnaire IA';
}

function extractDurationFromSymptoms(questionsData?: QuestionsData): string {
  const durations = safeExtractFromResponses(questionsData || {}, [
    'depuis', 'durée', 'début', 'temps'
  ]);
  
  return durations.length > 0 ? durations[0] : 'Durée à préciser';
}

function formatMedicalHistory(medicalHistory?: string[] | string): string {
  if (!medicalHistory) return MEDICAL_DEFAULTS.DEFAULT_MEDICAL_HISTORY;
  
  if (Array.isArray(medicalHistory)) {
    return medicalHistory.length > 0 
      ? medicalHistory.join(', ') 
      : MEDICAL_DEFAULTS.DEFAULT_MEDICAL_HISTORY;
  }
  
  return safeString(medicalHistory, MEDICAL_DEFAULTS.DEFAULT_MEDICAL_HISTORY);
}

function formatAllergies(allergies?: string[] | string): string {
  if (!allergies) return MEDICAL_DEFAULTS.DEFAULT_ALLERGIES;
  
  if (Array.isArray(allergies)) {
    return allergies.length > 0 
      ? allergies.join(', ') 
      : MEDICAL_DEFAULTS.DEFAULT_ALLERGIES;
  }
  
  return safeString(allergies, MEDICAL_DEFAULTS.DEFAULT_ALLERGIES);
}

function formatSocialHistory(lifeHabits?: PatientData['lifeHabits']): string {
  if (!lifeHabits || typeof lifeHabits !== 'object') {
    return 'Habitudes de vie non documentées';
  }
  
  const habits: string[] = [];
  
  if (lifeHabits.smoking) habits.push(`Tabac: ${lifeHabits.smoking}`);
  if (lifeHabits.alcohol) habits.push(`Alcool: ${lifeHabits.alcohol}`);
  if (lifeHabits.exercise) habits.push(`Activité physique: ${lifeHabits.exercise}`);
  if (lifeHabits.diet) habits.push(`Alimentation: ${lifeHabits.diet}`);
  
  return habits.length > 0 ? habits.join(', ') : 'Habitudes de vie non documentées';
}

function buildVitalSigns(clinicalData?: ClinicalData): string {
  if (!clinicalData) return MEDICAL_DEFAULTS.DEFAULT_VITAL_SIGNS;
  
  const vitals: string[] = [];
  
  if (clinicalData.bloodPressure) vitals.push(`TA: ${clinicalData.bloodPressure}`);
  if (clinicalData.heartRate) vitals.push(`FC: ${clinicalData.heartRate}/min`);
  if (clinicalData.respiratoryRate) vitals.push(`FR: ${clinicalData.respiratoryRate}/min`);
  if (clinicalData.temperature) vitals.push(`T°: ${clinicalData.temperature}°C`);
  if (clinicalData.oxygenSaturation) vitals.push(`SpO2: ${clinicalData.oxygenSaturation}%`);
  
  return vitals.length > 0 ? vitals.join(', ') : MEDICAL_DEFAULTS.DEFAULT_VITAL_SIGNS;
}

function extractExaminationsFromDiagnosis(diagnosisData: DiagnosisData, category: string, urgency?: string): string[] {
  const examinations: string[] = [];
  
  try {
    const investigations = safeArray(
      diagnosisData?.expertAnalysis?.expert_investigations?.immediate_priority
    );
    
    investigations.forEach((inv: any) => {
      if (inv && typeof inv === 'object' && inv.category === category) {
        if (!urgency || inv.urgency === urgency) {
          examinations.push(safeString(inv.examination, 'Examen non spécifié'));
        }
      }
    });
  } catch (error) {
    console.error(`Erreur extraction examinations ${category}:`, error);
  }
  
  return examinations;
}

function formatTreatments(treatments?: any[]): any[] {
  if (!Array.isArray(treatments)) return [];
  
  return treatments.map(treatment => {
    if (!treatment || typeof treatment !== 'object') return null;
    
    const dosingRegimen = safeString(treatment.dosing_regimen?.standard_adult);
    
    return {
      name: safeString(treatment.medication_dci, 'Médicament non spécifié'),
      dosage: dosingRegimen,
      frequency: extractFrequencyFromDosing(dosingRegimen),
      duration: safeString(treatment.treatment_duration, '7 jours'),
      indication: safeString(treatment.precise_indication),
      contraindications: safeArray(treatment.contraindications_absolute),
      mauritianAvailability: Boolean(treatment.mauritius_availability?.locally_available)
    };
  }).filter(Boolean);
}

function extractFrequencyFromDosing(dosingRegimen: string): string {
  if (!dosingRegimen || typeof dosingRegimen !== 'string') {
    return 'Selon prescription';
  }
  
  const dosing = dosingRegimen.toLowerCase();
  if (dosing.includes('x 3/jour') || dosing.includes('3 fois')) return '3 fois par jour';
  if (dosing.includes('x 2/jour') || dosing.includes('2 fois')) return '2 fois par jour';
  if (dosing.includes('x 1/jour') || dosing.includes('1 fois')) return '1 fois par jour';
  
  return 'Selon prescription';
}

// ================================
// GÉNÉRATION SÉCURISÉE
// ================================

async function generateCompleteConsultationReport(
  patientData: PatientData,
  clinicalData: ClinicalData = {},
  questionsData: QuestionsData = {},
  diagnosisData: DiagnosisData
) {
  try {
    console.log('🚀 Début génération rapport consultation...');
    
    // Récupération sécurisée des informations médecin
    const doctorInfo = validateDoctorInfo();
    console.log("✅ DOCTOR INFO =", doctorInfo)
    if (!doctorInfo) {
      throw new Error('Informations médecin manquantes - vérifiez les variables d\'environnement');
    }

    // Extraction sécurisée des données
    const symptoms = extractSymptomsArray(questionsData, clinicalData);
    const historyOfDisease = extractHistoryFromQuestionsData(questionsData);
    const duration = extractDurationFromSymptoms(questionsData);

    // Construction du diagnostic principal
    const primaryDiagnosis = diagnosisData?.diagnosis?.primary || diagnosisData?.primary_diagnosis || {};
    const diagnosticCondition = safeString(
      primaryDiagnosis.condition, 
      'Diagnostic à préciser'
    );

    // Construction du rapport structuré
    const consultationReport = {
      generatedAt: new Date().toISOString(),
      patientId: patientData?.id || null,
      consultationId: null,
      
      anamnesis: {
        chiefComplaint: safeString(clinicalData?.chiefComplaint, 'Motif de consultation à documenter'),
        historyOfDisease,
        duration,
        medicalHistory: formatMedicalHistory(patientData?.medicalHistory),
        currentMedications: safeString(
          patientData?.currentMedicationsText || patientData?.currentMedications,
          'Aucun traitement en cours'
        ),
        familyHistory: safeString(patientData?.familyHistory, 'Non documenté'),
        allergies: formatAllergies(patientData?.allergies),
        socialHistory: formatSocialHistory(patientData?.lifeHabits)
      },

      physicalExam: {
        generalExam: `Patient en ${safeString(clinicalData?.generalCondition, 'bon état général')}`,
        vitalSigns: buildVitalSigns(clinicalData),
        systemicExam: 'Examen systémique selon symptomatologie'
      },

      diagnosticAssessment: {
        primaryDiagnosis: {
          condition: diagnosticCondition,
          icd10: safeString(primaryDiagnosis.icd10),
          confidence: safeNumber(primaryDiagnosis.confidence, 85),
          severity: safeString(primaryDiagnosis.severity, 'Modéré'),
          rationale: safeString(primaryDiagnosis.rationale, 'Basé sur l\'anamnèse et l\'examen clinique')
        },
        differentialDiagnosis: safeArray(diagnosisData?.differential_diagnoses || diagnosisData?.diagnosis?.differential),
        clinicalJustification: `Diagnostic basé sur la symptomatologie clinique: ${symptoms.join(', ')}`
      },

      investigationsPlan: {
        laboratoryTests: {
          urgentTests: extractExaminationsFromDiagnosis(diagnosisData, 'biology', 'immediate'),
          routineTests: extractExaminationsFromDiagnosis(diagnosisData, 'biology')
        },
        imaging: {
          urgent: extractExaminationsFromDiagnosis(diagnosisData, 'imaging', 'immediate'),
          routine: extractExaminationsFromDiagnosis(diagnosisData, 'imaging')
        },
        specialTests: [
          ...extractExaminationsFromDiagnosis(diagnosisData, 'functional'),
          ...extractExaminationsFromDiagnosis(diagnosisData, 'special')
        ]
      },

      therapeuticPlan: {
        medications: formatTreatments(diagnosisData?.expertAnalysis?.expert_therapeutics?.primary_treatments),
        nonPharmacological: {
          lifestyleModifications: safeArray(diagnosisData?.expertAnalysis?.expert_therapeutics?.lifestyle_modifications),
          patientEducation: safeArray(diagnosisData?.expertAnalysis?.expert_therapeutics?.patient_education),
          mauritianSpecific: MEDICAL_DEFAULTS.MAURITIAN_RECOMMENDATIONS
        },
        followUp: safeString(
          diagnosisData?.expertAnalysis?.expert_therapeutics?.follow_up?.timeline,
          MEDICAL_DEFAULTS.DEFAULT_FOLLOW_UP
        ),
        prognosis: safeString(diagnosisData?.prognosis, 'Pronostic favorable avec traitement adapté')
      }
    };

    // ================================
    // 1. REFORMATER diagnosisData SELON LA STRUCTURE ATTENDUE
    // ================================
    
    const diagnosisDataForGenerator = {
      diagnosis: {
        primary: {
          condition: diagnosticCondition,
          confidence: consultationReport.diagnosticAssessment.primaryDiagnosis.confidence,
          rationale: consultationReport.diagnosticAssessment.primaryDiagnosis.rationale,
          icd10: consultationReport.diagnosticAssessment.primaryDiagnosis.icd10,
          severity: consultationReport.diagnosticAssessment.primaryDiagnosis.severity
        },
        differential: consultationReport.diagnosticAssessment.differentialDiagnosis
      },
      suggestedExams: {
        lab: [
          ...consultationReport.investigationsPlan.laboratoryTests.urgentTests.map(test => ({
            name: test,
            indication: `Urgent - ${diagnosticCondition}`,
            urgency: 'URGENT'
          })),
          ...consultationReport.investigationsPlan.laboratoryTests.routineTests.map(test => ({
            name: test,
            indication: diagnosticCondition,
            urgency: '48h'
          }))
        ],
        imaging: [
          ...consultationReport.investigationsPlan.imaging.urgent.map(exam => ({
            name: exam,
            indication: `Urgent - ${diagnosticCondition}`,
            urgency: 'URGENT'
          })),
          ...consultationReport.investigationsPlan.imaging.routine.map(exam => ({
            name: exam,
            indication: diagnosticCondition,
            urgency: 'Dans la semaine'
          }))
        ],
        other: consultationReport.investigationsPlan.specialTests.map(test => ({
          name: test,
          indication: 'Complément diagnostic'
        }))
      },
      treatmentPlan: {
        medications: consultationReport.therapeuticPlan.medications,
        recommendations: [
          ...consultationReport.therapeuticPlan.nonPharmacological.lifestyleModifications,
          ...consultationReport.therapeuticPlan.nonPharmacological.patientEducation,
          ...consultationReport.therapeuticPlan.nonPharmacological.mauritianSpecific
        ]
      },
      followUp: {
        nextVisit: consultationReport.therapeuticPlan.followUp
      }
    };

    // ================================
    // 2. CONSTRUIRE consultationData COMPLET AVANT L'APPEL
    // ================================
    
    const consultationData = {
      patientInfo: {
        firstName: patientData.firstName,
        lastName: patientData.lastName,
        age: patientData.age,
        gender: safeString(patientData.gender),
        weight: patientData.weight,
        height: patientData.height,
        bmi: calculateBMI(patientData.weight, patientData.height),
        address: safeString(patientData.address),
        phone: safeString(patientData.phone),
        allergies: formatAllergies(patientData.allergies),
        medicalHistory: formatMedicalHistory(patientData.medicalHistory),
        currentMedications: safeString(
          patientData.currentMedicationsText || patientData.currentMedications, 
          'Aucun'
        )
      },
      chiefComplaint: consultationReport.anamnesis.chiefComplaint,
      diseaseHistory: consultationReport.anamnesis.historyOfDisease,
      symptoms: symptoms,
      symptomDuration: consultationReport.anamnesis.duration,
      diagnosis: diagnosisDataForGenerator.diagnosis.primary.condition,
      diagnosticConfidence: diagnosisDataForGenerator.diagnosis.primary.confidence,
      diagnosticReasoning: diagnosisDataForGenerator.diagnosis.primary.rationale,
      differentialDiagnoses: diagnosisDataForGenerator.diagnosis.differential,
      medications: diagnosisDataForGenerator.treatmentPlan.medications,
      recommendations: diagnosisDataForGenerator.treatmentPlan.recommendations,
      followUp: diagnosisDataForGenerator.followUp,
      examination: `${consultationReport.physicalExam.generalExam}\n${consultationReport.physicalExam.vitalSigns}`
    };

    // ================================
    // 3. VALIDATION DES DONNÉES CRITIQUES AVANT GÉNÉRATION
    // ================================
    
    console.log('🔍 Validation données pour générateur...');
    
    // Vérifier que les données critiques sont présentes
    if (!diagnosisDataForGenerator.diagnosis.primary.condition) {
      throw new Error('diagnosisData.diagnosis.primary.condition manquant');
    }
    
    if (!patientData.firstName || !patientData.lastName) {
      throw new Error('patientData.firstName et lastName requis');
    }
    
    if (!doctorInfo.fullName || !doctorInfo.registrationNumber) {
      throw new Error('doctorInfo incomplet');
    }

    console.log('✅ Validation réussie, génération en cours...');
    console.log('📋 Données diagnostic:', {
      condition: diagnosisDataForGenerator.diagnosis.primary.condition,
      confidence: diagnosisDataForGenerator.diagnosis.primary.confidence
    });

    // ================================
    // 4. APPELER EXPLICITEMENT LE GÉNÉRATEUR
    // ================================
    
    const mauritianDocuments = await Promise.race([
      Promise.resolve(MauritianDocumentsGenerator.generateMauritianDocuments(
        { consultationData }, // 1er paramètre : objet contenant consultationData
        doctorInfo,           // 2e paramètre : informations du médecin
        patientData,          // 3e paramètre : données patient
        diagnosisDataForGenerator // 4e paramètre : diagnostic formatté
      )),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout génération documents')), TIMEOUT_MS)
      )
    ]);

    // Vérifier que les documents ont été générés
    if (!mauritianDocuments || Object.keys(mauritianDocuments).length === 0) {
      console.warn('⚠️ Documents mauriciens vides générés');
    } else {
      console.log('✅ Documents mauriciens générés:', Object.keys(mauritianDocuments));
    }

    console.log('✅ Rapport consultation généré avec succès');

    return {
      ...consultationReport,
      mauritianDocuments,
      doctorInfo
    };

  } catch (error) {
    console.error('❌ Erreur génération rapport:', error);
    throw error;
  }
}

// ================================
// ENDPOINTS API
// ================================

export async function POST(request: NextRequest) {
  try {
    console.log('📨 Nouvelle requête génération rapport consultation');

    // Parse et validation du body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
      console.error('❌ Erreur parsing JSON:', error);
      return Response.json({
        success: false,
        error: 'Corps de requête JSON invalide'
      }, { status: 400 });
    }

    // Validation des données
    const validation = validateRequestBody(body);
    if (!validation.isValid) {
      console.error('❌ Validation échouée:', validation.errors);
      return Response.json({
        success: false,
        error: 'Données de requête invalides',
        details: validation.errors
      }, { status: 400 });
    }

    const { patientData, clinicalData, questionsData, diagnosisData } = body as RequestBody;

    // Génération du rapport avec timeout global
    const consultationReport = await Promise.race([
      generateCompleteConsultationReport(patientData, clinicalData, questionsData, diagnosisData),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout génération rapport')), TIMEOUT_MS)
      )
    ]);

    return Response.json({
      success: true,
      data: consultationReport
    });

  } catch (error) {
    console.error('❌ Erreur API génération rapport:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    const isTimeout = errorMessage.includes('Timeout');
    
    return Response.json({
      success: false,
      error: isTimeout ? 'Timeout lors de la génération' : 'Erreur lors de la génération du rapport',
      details: errorMessage
    }, { status: isTimeout ? 408 : 500 });
  }
}

export async function GET() {
  return Response.json({ 
    error: 'Méthode GET non supportée. Utilisez POST.',
    usage: {
      method: 'POST',
      contentType: 'application/json',
      requiredFields: ['patientData', 'diagnosisData'],
      optionalFields: ['clinicalData', 'questionsData']
    }
  }, { status: 405 });
}

// ================================
// FONCTION DE TEST MINIMAL (à utiliser pour débugger)
// ================================

export async function testMinimalGeneration() {
  console.log('🧪 Test minimal génération documents...');
  
  try {
    // Données minimales de test
    const patientData = { 
      firstName: 'Jean', 
      lastName: 'Dupont', 
      age: 45, 
      gender: 'M' 
    };
    
    const diagnosisDataForGenerator = {
      diagnosis: { 
        primary: { 
          condition: 'Hypertension', 
          confidence: 80,
          rationale: 'Diagnostic basé sur les symptômes cliniques'
        }, 
        differential: [] 
      },
      suggestedExams: { 
        lab: [{ name: 'NFS', indication: 'Bilan de routine' }], 
        imaging: [{ name: 'ECG', indication: 'Évaluation cardiaque' }] 
      },
      treatmentPlan: { 
        medications: [{ 
          name: 'Amlodipine', 
          dosage: '5 mg', 
          frequency: '1 fois/j', 
          duration: '30 j' 
        }], 
        recommendations: ['Régime pauvre en sel'] 
      },
      followUp: { nextVisit: '2025-08-30' }
    };
    
    const consultationData = {
      patientInfo: patientData,
      chiefComplaint: 'Hypertension', 
      diagnosis: 'Hypertension',
      diagnosticConfidence: 80,
      diagnosticReasoning: 'Diagnostic basé sur les symptômes cliniques',
      differentialDiagnoses: [], 
      medications: diagnosisDataForGenerator.treatmentPlan.medications,
      recommendations: diagnosisDataForGenerator.treatmentPlan.recommendations, 
      followUp: { nextVisit: '2025-08-30' },
      symptoms: ['Céphalées', 'Fatigue'],
      diseaseHistory: 'Hypertension récente',
      symptomDuration: '2 semaines'
    };
    
    const doctorInfo = validateDoctorInfo();
    if (!doctorInfo) {
      throw new Error('Variables d\'environnement médecin manquantes');
    }
    
    console.log('📋 Appel générateur avec données minimales...');
    
    const docs = MauritianDocumentsGenerator.generateMauritianDocuments(
      { consultationData }, // 1er paramètre : objet contenant consultationData
      doctorInfo,           // 2e paramètre : informations du médecin
      patientData,          // 3e paramètre : données patient
      diagnosisDataForGenerator // 4e paramètre : diagnostic formatté
    );
    
    console.log('✅ Test réussi ! Documents générés:', Object.keys(docs));
    console.log('📄 Aperçu consultation:', docs.consultation?.header?.substring(0, 100) + '...');
    
    return {
      success: true,
      documentsGenerated: Object.keys(docs),
      preview: {
        consultation: docs.consultation?.header?.substring(0, 200),
        biology: docs.biology?.prescriptions?.length || 0,
        medication: docs.medication?.prescriptions?.length || 0
      }
    };
    
  } catch (error) {
    console.error('❌ Test minimal échoué:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      recommendation: 'Vérifiez les variables d\'environnement médecin et le fichier MauritianDocumentsGenerator'
    };
  }
}

// Uncomment cette ligne pour tester au démarrage du serveur
// testMinimalGeneration().then(console.log);
