// app/api/generate-consultation-report/route.ts - Version corrigée pour App Router

import { NextRequest } from 'next/server';
import { MauritianDocumentsGenerator } from '@/lib/mauritian-documents-generator';

// ✅ NOUVELLE SYNTAXE APP ROUTER
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patientData, clinicalData, questionsData, diagnosisData } = body;

    // Validation des données requises
    if (!patientData || !diagnosisData) {
      return Response.json({
        error: 'Missing required data',
        details: 'patientData and diagnosisData are required'
      }, { status: 400 });
    }

    console.log('🚀 Generating consultation report...');

    // ✅ Générer le rapport de consultation complet avec les documents mauriciens
    const consultationReport = await generateCompleteConsultationReport(
      patientData,
      clinicalData,
      questionsData,
      diagnosisData
    );

    console.log('✅ Consultation report generated successfully');

    return Response.json({
      success: true,
      data: consultationReport
    });

  } catch (error) {
    console.error('❌ Error generating consultation report:', error);
    
    return Response.json({
      success: false,
      error: 'Failed to generate consultation report',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// ✅ Optionnel : Gérer les autres méthodes HTTP
export async function GET() {
  return Response.json({ 
    error: 'GET method not supported. Use POST.' 
  }, { status: 405 });
}

/**
 * Génère un rapport de consultation complet avec documents mauriciens
 */
async function generateCompleteConsultationReport(
  patientData: any,
  clinicalData: any,
  questionsData: any,
  diagnosisData: any
) {
  try {
    // 1. Construire les informations du médecin (temporaire - sera remplacé par les vraies données)
    const doctorInfo = {
      fullName: "Dr. MÉDECIN EXPERT",
      specialty: "Médecine générale",
      address: "Cabinet médical, Rue principale",
      city: "Port-Louis, Maurice",
      phone: "+230 xxx xxx xxx",
      email: "contact@cabinet.mu",
      registrationNumber: "Medical Council of Mauritius - Reg. No. XXXXX"
    };

    // 2. Construire le compte-rendu de consultation structuré
    const consultationReport = {
      // Métadonnées
      generatedAt: new Date().toISOString(),
      patientId: patientData?.id || null,
      consultationId: null, // sera rempli par le service appelant
      
      // Anamnèse structurée
      anamnesis: {
        chiefComplaint: clinicalData?.chiefComplaint || "Motif de consultation à documenter",
        historyOfDisease: clinicalData?.historyOfDisease || extractHistoryFromQuestionsData(questionsData),
        duration: clinicalData?.duration || extractDurationFromSymptoms(questionsData),
        medicalHistory: formatMedicalHistory(patientData?.medicalHistory),
        currentMedications: patientData?.currentMedicationsText || patientData?.currentMedications || "Aucun traitement en cours",
        familyHistory: patientData?.familyHistory || "Non documenté",
        allergies: formatAllergies(patientData?.allergies),
        socialHistory: formatSocialHistory(patientData?.lifeHabits)
      },

      // Examen physique structuré
      physicalExam: {
        generalExam: buildGeneralExamination(clinicalData, patientData),
        vitalSigns: buildVitalSigns(clinicalData),
        systemicExam: buildSystemicExamination(clinicalData)
      },

      // Évaluation diagnostique
      diagnosticAssessment: {
        primaryDiagnosis: {
          condition: diagnosisData?.diagnosis?.primary?.condition || diagnosisData?.primary_diagnosis?.condition || "Diagnostic à préciser",
          icd10: diagnosisData?.diagnosis?.primary?.icd10 || diagnosisData?.primary_diagnosis?.icd10 || "",
          confidence: diagnosisData?.diagnosis?.primary?.confidence || diagnosisData?.primary_diagnosis?.confidence || 85,
          severity: diagnosisData?.diagnosis?.primary?.severity || "Modéré",
          rationale: diagnosisData?.diagnosis?.primary?.rationale || "Basé sur l'anamnèse et l'examen clinique"
        },
        differentialDiagnosis: formatDifferentialDiagnoses(diagnosisData?.differential_diagnoses || diagnosisData?.diagnosis?.differential || []),
        clinicalJustification: buildClinicalJustification(diagnosisData, clinicalData)
      },

      // Plan d'investigations
      investigationsPlan: {
        laboratoryTests: {
          urgentTests: extractUrgentLabTests(diagnosisData),
          routineTests: extractRoutineLabTests(diagnosisData)
        },
        imaging: {
          urgent: extractUrgentImaging(diagnosisData),
          routine: extractRoutineImaging(diagnosisData)
        },
        specialTests: extractSpecialTests(diagnosisData),
        mauritianAvailability: assessMauritianAvailability(diagnosisData)
      },

      // Plan thérapeutique
      therapeuticPlan: {
        immediateManagement: {
          urgentInterventions: extractUrgentInterventions(diagnosisData),
          symptomaticTreatment: extractSymptomaticTreatments(diagnosisData)
        },
        medications: formatMedications(diagnosisData?.expertAnalysis?.expert_therapeutics?.primary_treatments || []),
        nonPharmacological: {
          lifestyleModifications: extractLifestyleRecommendations(diagnosisData),
          patientEducation: extractPatientEducation(diagnosisData),
          mauritianSpecific: [
            "Hydratation renforcée (climat tropical Maurice)",
            "Protection anti-moustiques (dengue/chikungunya endémiques)",
            "Éviter exposition solaire aux heures chaudes"
          ]
        },
        followUp: buildFollowUpPlan(diagnosisData),
        prognosis: diagnosisData?.prognosis || "Pronostic favorable avec traitement adapté"
      }
    };

    // 3. ✅ Préparer les données dans le format attendu par le générateur
    const consultationDataForGenerator = {
      patientInfo: {
        firstName: patientData?.firstName || '',
        lastName: patientData?.lastName || '',
        age: patientData?.age || 0,
        gender: patientData?.gender || '',
        address: patientData?.address || '',
        phone: patientData?.phone || '',
        allergies: Array.isArray(patientData?.allergies) 
          ? patientData.allergies.join(', ') 
          : (patientData?.allergies || ''),
        weight: patientData?.weight || null,
        height: patientData?.height || null,
        bmi: patientData?.weight && patientData?.height 
          ? (patientData.weight / ((patientData.height / 100) ** 2)).toFixed(1) 
          : null,
      },
      chiefComplaint: clinicalData?.chiefComplaint || '',
      diseaseHistory: consultationReport.anamnesis?.historyOfDisease || '',
      symptoms: extractSymptomsArray(questionsData, clinicalData), // Extraire les symptômes sous forme de tableau
      symptomDuration: consultationReport.anamnesis?.duration || '',
      diagnosis: consultationReport.diagnosticAssessment.primaryDiagnosis.condition,
      diagnosticConfidence: consultationReport.diagnosticAssessment.primaryDiagnosis.confidence,
      diagnosticReasoning: consultationReport.diagnosticAssessment.primaryDiagnosis.rationale,
      differentialDiagnoses: consultationReport.diagnosticAssessment.differentialDiagnosis,
      examination: consultationReport.physicalExam ? 
        `${consultationReport.physicalExam.generalExam}\n${consultationReport.physicalExam.vitalSigns}\n${consultationReport.physicalExam.systemicExam}` 
        : 'Examen clinique complet effectué',
      treatment: consultationReport.therapeuticPlan?.medications?.map((med: any) => 
        `${med.name} ${med.dosage} - ${med.frequency}`
      ).join('; ') || 'Traitement selon protocole',
      followUpPlan: consultationReport.therapeuticPlan?.followUp || 'Suivi médical recommandé',
    };

    // Préparer les données enrichies pour le générateur (avec structure pour prescriptions)
    const enrichedDiagnosisData = {
      ...diagnosisData,
      // Mapper les examens suggérés dans le format attendu par le générateur
      suggestedExams: {
        lab: consultationReport.investigationsPlan?.laboratoryTests ? [
          ...consultationReport.investigationsPlan.laboratoryTests.urgentTests.map((test: string) => ({
            name: test,
            indication: `Urgent - ${consultationReport.diagnosticAssessment.primaryDiagnosis.condition}`,
            urgency: 'URGENT'
          })),
          ...consultationReport.investigationsPlan.laboratoryTests.routineTests.map((test: string) => ({
            name: test,
            indication: consultationReport.diagnosticAssessment.primaryDiagnosis.condition,
            urgency: '48h'
          }))
        ] : [],
        imaging: consultationReport.investigationsPlan?.imaging ? [
          ...consultationReport.investigationsPlan.imaging.urgent.map((exam: string) => ({
            name: exam,
            indication: `Urgent - ${consultationReport.diagnosticAssessment.primaryDiagnosis.condition}`,
            urgency: 'URGENT'
          })),
          ...consultationReport.investigationsPlan.imaging.routine.map((exam: string) => ({
            name: exam,
            indication: consultationReport.diagnosticAssessment.primaryDiagnosis.condition,
            urgency: 'Dans la semaine'
          }))
        ] : [],
        other: consultationReport.investigationsPlan?.specialTests?.map((test: string) => ({
          name: test,
          indication: 'Complément diagnostic'
        })) || []
      },
      // Mapper le plan thérapeutique
      treatmentPlan: {
        medications: consultationReport.therapeuticPlan?.medications || [],
        recommendations: [
          ...consultationReport.therapeuticPlan?.nonPharmacological?.lifestyleModifications || [],
          ...consultationReport.therapeuticPlan?.nonPharmacological?.patientEducation || [],
          ...consultationReport.therapeuticPlan?.nonPharmacological?.mauritianSpecific || []
        ]
      },
      // Ajouter les symptômes si disponibles
      symptoms: extractSymptomsArray(questionsData, clinicalData),
      // Informations de suivi
      followUp: {
        nextVisit: consultationReport.therapeuticPlan?.followUp || 'Revoir si pas d\'amélioration dans 72h'
      }
    };

    // 4. ✅ Générer automatiquement les documents mauriciens avec la structure adaptée
    const mauritianDocuments = MauritianDocumentsGenerator.generateMauritianDocuments(
      { consultationData: consultationDataForGenerator }, // Structure attendue par le générateur
      doctorInfo,
      patientData,
      enrichedDiagnosisData // Données enrichies pour les prescriptions
    );

    // 4. ✅ CORRECTION : Retourner le rapport complet sans formattedDocuments
    return {
      ...consultationReport,
      mauritianDocuments,
      doctorInfo
    };

  } catch (error) {
    console.error('Error in generateCompleteConsultationReport:', error);
    throw error;
  }
}

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

function extractSymptomsArray(questionsData: any, clinicalData: any): string[] {
  const symptoms: string[] = [];
  
  // Extraire les symptômes depuis questionsData
  if (questionsData?.responses) {
    Object.entries(questionsData.responses).forEach(([question, answer]: [string, any]) => {
      if (question.toLowerCase().includes('symptôme') || 
          question.toLowerCase().includes('ressent') ||
          question.toLowerCase().includes('douleur') ||
          question.toLowerCase().includes('mal') ||
          question.toLowerCase().includes('problème')) {
        if (typeof answer === 'string' && answer.trim()) {
          symptoms.push(answer.trim());
        }
      }
    });
  }
  
  // Ajouter le motif principal si disponible
  if (clinicalData?.chiefComplaint && !symptoms.includes(clinicalData.chiefComplaint)) {
    symptoms.push(clinicalData.chiefComplaint);
  }
  
  return symptoms.length > 0 ? symptoms : ['Symptômes à documenter'];
}

function extractHistoryFromQuestionsData(questionsData: any): string {
  if (!questionsData?.responses) return "Histoire de la maladie actuelle à documenter";
  
  const responses = questionsData.responses;
  const historyParts: string[] = [];
  
  // Extraire les réponses pertinentes pour l'histoire
  Object.entries(responses).forEach(([question, answer]: [string, any]) => {
    if (question.toLowerCase().includes('symptôme') || 
        question.toLowerCase().includes('douleur') ||
        question.toLowerCase().includes('évolution')) {
      historyParts.push(`${question}: ${answer}`);
    }
  });
  
  return historyParts.length > 0 ? historyParts.join('\n') : "Histoire documentée via questionnaire IA";
}

function extractDurationFromSymptoms(questionsData: any): string {
  if (!questionsData?.responses) return "Durée non précisée";
  
  const responses = questionsData.responses;
  for (const [question, answer] of Object.entries(responses)) {
    if (question.toLowerCase().includes('depuis') || 
        question.toLowerCase().includes('durée') ||
        question.toLowerCase().includes('début')) {
      return answer as string;
    }
  }
  
  return "Durée à préciser";
}

function formatMedicalHistory(medicalHistory: any): string {
  if (!medicalHistory) return "Aucun antécédent particulier";
  
  if (Array.isArray(medicalHistory)) {
    return medicalHistory.length > 0 ? medicalHistory.join(', ') : "Aucun antécédent particulier";
  }
  
  return medicalHistory.toString();
}

function formatAllergies(allergies: any): string {
  if (!allergies) return "Aucune allergie connue";
  
  if (Array.isArray(allergies)) {
    return allergies.length > 0 ? allergies.join(', ') : "Aucune allergie connue";
  }
  
  return allergies.toString();
}

function formatSocialHistory(lifeHabits: any): string {
  if (!lifeHabits) return "Habitudes de vie non documentées";
  
  const habits: string[] = [];
  
  if (lifeHabits.smoking) habits.push(`Tabac: ${lifeHabits.smoking}`);
  if (lifeHabits.alcohol) habits.push(`Alcool: ${lifeHabits.alcohol}`);
  if (lifeHabits.exercise) habits.push(`Activité physique: ${lifeHabits.exercise}`);
  if (lifeHabits.diet) habits.push(`Alimentation: ${lifeHabits.diet}`);
  
  return habits.length > 0 ? habits.join(', ') : "Habitudes de vie non documentées";
}

function buildGeneralExamination(clinicalData: any, patientData: any): string {
  const parts: string[] = [];
  
  // État général
  if (clinicalData?.generalCondition) {
    parts.push(`État général: ${clinicalData.generalCondition}`);
  } else {
    parts.push("Patient en bon état général");
  }
  
  // Données anthropométriques
  if (patientData?.weight || patientData?.height) {
    const anthropometry: string[] = [];
    if (patientData.weight) anthropometry.push(`Poids: ${patientData.weight}kg`);
    if (patientData.height) anthropometry.push(`Taille: ${patientData.height}cm`);
    parts.push(anthropometry.join(', '));
  }
  
  return parts.join('\n');
}

function buildVitalSigns(clinicalData: any): string {
  const vitals: string[] = [];
  
  if (clinicalData?.bloodPressure) vitals.push(`TA: ${clinicalData.bloodPressure}`);
  if (clinicalData?.heartRate) vitals.push(`FC: ${clinicalData.heartRate}/min`);
  if (clinicalData?.respiratoryRate) vitals.push(`FR: ${clinicalData.respiratoryRate}/min`);
  if (clinicalData?.temperature) vitals.push(`T°: ${clinicalData.temperature}°C`);
  if (clinicalData?.oxygenSaturation) vitals.push(`SpO2: ${clinicalData.oxygenSaturation}%`);
  
  return vitals.length > 0 ? vitals.join(', ') : "Signes vitaux stables";
}

function buildSystemicExamination(clinicalData: any): string {
  const systems: string[] = [];
  
  if (clinicalData?.cardiovascularExam) systems.push(`Cardiovasculaire: ${clinicalData.cardiovascularExam}`);
  if (clinicalData?.respiratoryExam) systems.push(`Pulmonaire: ${clinicalData.respiratoryExam}`);
  if (clinicalData?.abdominalExam) systems.push(`Abdominal: ${clinicalData.abdominalExam}`);
  if (clinicalData?.neurologicalExam) systems.push(`Neurologique: ${clinicalData.neurologicalExam}`);
  if (clinicalData?.dermatologicalExam) systems.push(`Dermatologique: ${clinicalData.dermatologicalExam}`);
  
  return systems.length > 0 ? systems.join('\n') : "Examen systémique selon symptomatologie";
}

function formatDifferentialDiagnoses(differentials: any[]): any[] {
  return differentials.map((diff: any) => ({
    condition: diff.condition || diff.diagnosis || "",
    probability: diff.probability || diff.likelihood || 0,
    rationale: diff.rationale || diff.reasoning || "",
    excludingFactors: diff.excluding_factors || []
  }));
}

function buildClinicalJustification(diagnosisData: any, clinicalData: any): string {
  const justifications: string[] = [];
  
  // Arguments cliniques
  if (diagnosisData?.diagnosis?.primary?.rationale) {
    justifications.push(diagnosisData.diagnosis.primary.rationale);
  }
  
  // Signes cliniques évocateurs
  if (clinicalData?.chiefComplaint) {
    justifications.push(`Symptomatologie évocatrice: ${clinicalData.chiefComplaint}`);
  }
  
  return justifications.join('\n') || "Diagnostic basé sur l'anamnèse et l'examen clinique";
}

function extractUrgentLabTests(diagnosisData: any): string[] {
  const urgentTests: string[] = [];
  
  const investigations = diagnosisData?.expertAnalysis?.expert_investigations?.immediate_priority || [];
  investigations.forEach((inv: any) => {
    if (inv.category === 'biology' && inv.urgency === 'immediate') {
      urgentTests.push(inv.examination);
    }
  });
  
  return urgentTests;
}

function extractRoutineLabTests(diagnosisData: any): string[] {
  const routineTests: string[] = [];
  
  const investigations = diagnosisData?.expertAnalysis?.expert_investigations?.immediate_priority || [];
  investigations.forEach((inv: any) => {
    if (inv.category === 'biology' && inv.urgency !== 'immediate') {
      routineTests.push(inv.examination);
    }
  });
  
  return routineTests;
}

function extractUrgentImaging(diagnosisData: any): string[] {
  const urgentImaging: string[] = [];
  
  const investigations = diagnosisData?.expertAnalysis?.expert_investigations?.immediate_priority || [];
  investigations.forEach((inv: any) => {
    if (inv.category === 'imaging' && inv.urgency === 'immediate') {
      urgentImaging.push(inv.examination);
    }
  });
  
  return urgentImaging;
}

function extractRoutineImaging(diagnosisData: any): string[] {
  const routineImaging: string[] = [];
  
  const investigations = diagnosisData?.expertAnalysis?.expert_investigations?.immediate_priority || [];
  investigations.forEach((inv: any) => {
    if (inv.category === 'imaging' && inv.urgency !== 'immediate') {
      routineImaging.push(inv.examination);
    }
  });
  
  return routineImaging;
}

function extractSpecialTests(diagnosisData: any): string[] {
  const specialTests: string[] = [];
  
  const investigations = diagnosisData?.expertAnalysis?.expert_investigations?.immediate_priority || [];
  investigations.forEach((inv: any) => {
    if (inv.category === 'functional' || inv.category === 'special') {
      specialTests.push(inv.examination);
    }
  });
  
  return specialTests;
}

function assessMauritianAvailability(diagnosisData: any): any {
  return {
    publicSector: "Disponible hôpitaux publics Maurice",
    privateSector: "Disponible centres privés",
    estimatedDelay: "24-48h secteur public, immédiat privé",
    cost: "Gratuit public / Rs 500-2000 privé selon examen"
  };
}

function extractUrgentInterventions(diagnosisData: any): string[] {
  const interventions: string[] = [];
  
  const therapeutics = diagnosisData?.expertAnalysis?.expert_therapeutics;
  if (therapeutics?.emergency_management) {
    therapeutics.emergency_management.forEach((intervention: any) => {
      interventions.push(intervention.intervention || intervention);
    });
  }
  
  return interventions;
}

function extractSymptomaticTreatments(diagnosisData: any): string[] {
  const treatments: string[] = [];
  
  const therapeutics = diagnosisData?.expertAnalysis?.expert_therapeutics?.primary_treatments || [];
  therapeutics.forEach((treatment: any) => {
    if (treatment.therapeutic_class?.includes('Symptomatique') || 
        treatment.therapeutic_class?.includes('Antalgique')) {
      treatments.push(`${treatment.medication_dci} - ${treatment.dosing_regimen?.standard_adult || ''}`);
    }
  });
  
  return treatments;
}

function formatMedications(treatments: any[]): any[] {
  return treatments.map((treatment: any) => ({
    name: treatment.medication_dci || "",
    dosage: treatment.dosing_regimen?.standard_adult || "",
    frequency: extractFrequency(treatment.dosing_regimen?.standard_adult || ""),
    duration: treatment.treatment_duration || "7 jours",
    indication: treatment.precise_indication || "",
    contraindications: treatment.contraindications_absolute || [],
    mauritianAvailability: treatment.mauritius_availability?.locally_available || false
  }));
}

function extractFrequency(dosingRegimen: string): string {
  if (dosingRegimen.includes('x 3/jour')) return "3 fois par jour";
  if (dosingRegimen.includes('x 2/jour')) return "2 fois par jour";
  if (dosingRegimen.includes('x 1/jour')) return "1 fois par jour";
  return "Selon prescription";
}

function extractLifestyleRecommendations(diagnosisData: any): string[] {
  const recommendations: string[] = [];
  
  const therapeutics = diagnosisData?.expertAnalysis?.expert_therapeutics;
  if (therapeutics?.lifestyle_modifications) {
    therapeutics.lifestyle_modifications.forEach((rec: any) => {
      recommendations.push(rec.recommendation || rec);
    });
  }
  
  // Recommandations par défaut
  if (recommendations.length === 0) {
    recommendations.push("Repos adapté selon symptomatologie");
    recommendations.push("Alimentation équilibrée");
    recommendations.push("Hydratation suffisante");
  }
  
  return recommendations;
}

function extractPatientEducation(diagnosisData: any): string[] {
  const education: string[] = [];
  
  const therapeutics = diagnosisData?.expertAnalysis?.expert_therapeutics;
  if (therapeutics?.patient_education) {
    therapeutics.patient_education.forEach((item: any) => {
      education.push(item.education_point || item);
    });
  }
  
  // Éducation par défaut
  if (education.length === 0) {
    education.push("Respecter la prescription médicale");
    education.push("Consulter en urgence si aggravation");
    education.push("Suivi médical selon recommandations");
  }
  
  return education;
}

function buildFollowUpPlan(diagnosisData: any): string {
  const followUp = diagnosisData?.expertAnalysis?.expert_therapeutics?.follow_up;
  
  if (followUp?.timeline) {
    return `Consultation de contrôle dans ${followUp.timeline}. ${followUp.monitoring_parameters || 'Surveillance clinique.'}`;
  }
  
  return "Consultation de réévaluation si pas d'amélioration sous 48-72h";
}
