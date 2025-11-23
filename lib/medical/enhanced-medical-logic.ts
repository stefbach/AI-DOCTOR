// lib/medical/enhanced-medical-logic.ts - MODULE D'INTÉGRATION LOGIQUE MÉDICALE AMÉLIORÉE
// Version 1.0 - Intégration sécurisée sans casser le code existant

import { 
  DRUG_INTERACTIONS_DATABASE, 
  checkDrugInteractions, 
  checkSpecificInteraction,
  type DrugInteraction 
} from './drug-interactions'

import {
  generateDifferentialDiagnoses,
  getCannotMissDiagnoses,
  sortByUrgency,
  type DifferentialDiagnosis
} from './differential-diagnosis'

import {
  calculateEGFR,
  calculateCockcroftGault,
  adjustDoseForRenalFunction,
  adjustDoseForHepaticFunction,
  checkGeriatricAppropriate,
  getAllDoseAdjustments,
  type DoseAdjustment,
  type ChildPughClass
} from './dose-adjustments'

import {
  CLINICAL_SCORES,
  type ScoreResult
} from './clinical-scores'

// ==================== INTERFACE DE CONTEXTE PATIENT ====================
export interface EnhancedPatientContext {
  age: number
  sex: 'M' | 'F' | 'male' | 'female'
  weight?: number
  height?: number
  chief_complaint: string
  symptoms: string[]
  vital_signs?: {
    blood_pressure?: string
    pulse?: number
    temperature?: number
    respiratory_rate?: number
    oxygen_saturation?: number
  }
  current_medications: string[]
  medical_history: string[]
  allergies: string[]
  
  // Pour ajustements posologiques
  creatinine?: number // µmol/L
  egfr?: number
  childPugh?: ChildPughClass
  
  // Pour scores cliniques
  labResults?: {
    urea?: number
    wbc?: number
    neutrophils?: number
    [key: string]: any
  }
}

// ==================== ANALYSE MÉDICALE AMÉLIORÉE ====================
export interface EnhancedMedicalAnalysis {
  // Diagnostics différentiels
  differential_diagnoses: DifferentialDiagnosis[]
  cannot_miss_diagnoses: DifferentialDiagnosis[]
  
  // Interactions médicamenteuses
  drug_interactions: {
    total_interactions_checked: number
    critical_interactions: DrugInteraction[]
    major_interactions: DrugInteraction[]
    moderate_interactions: DrugInteraction[]
    safety_level: 'safe' | 'caution' | 'unsafe' | 'contraindicated'
    recommendations: string[]
  }
  
  // Ajustements posologiques
  dose_adjustments: {
    medications_requiring_adjustment: Array<{
      medication: string
      adjustments: DoseAdjustment[]
      contraindicated: boolean
    }>
    renal_function?: {
      egfr: number
      stage: string
      recommendation: string
    }
  }
  
  // Scores cliniques applicables
  clinical_scores: ScoreResult[]
  
  // Qualité globale de l'analyse
  quality_assessment: {
    interactions_checked: boolean
    dose_adjustments_checked: boolean
    differential_diagnoses_generated: boolean
    clinical_scores_applied: boolean
    overall_safety_score: number
  }
}

// ==================== FONCTION PRINCIPALE D'AMÉLIORATION ====================
export function enhanceMedicalAnalysis(
  gpt4Analysis: any,
  patientContext: EnhancedPatientContext
): EnhancedMedicalAnalysis {
  
  console.log('🚀 Enhanced Medical Logic: Starting comprehensive analysis...')
  
  // 1. GÉNÉRER DIAGNOSTICS DIFFÉRENTIELS
  console.log('📋 Generating differential diagnoses...')
  const allDifferentials = generateDifferentialDiagnoses(
    patientContext.chief_complaint,
    patientContext.symptoms,
    patientContext.vital_signs
  )
  
  const sortedDifferentials = sortByUrgency(allDifferentials)
  const cannotMiss = getCannotMissDiagnoses(sortedDifferentials)
  
  console.log(`   ✓ Generated ${sortedDifferentials.length} differential diagnoses`)
  console.log(`   ⚠️  ${cannotMiss.length} "cannot miss" diagnoses identified`)
  
  // 2. VÉRIFIER INTERACTIONS MÉDICAMENTEUSES
  console.log('💊 Checking drug interactions...')
  const allMedications = [
    ...patientContext.current_medications,
    ...(gpt4Analysis?.treatment_plan?.medications || []).map((m: any) => 
      m?.drug || m?.medication_name || ''
    )
  ].filter(Boolean)
  
  const interactions = checkDrugInteractions(allMedications)
  
  const criticalInteractions = interactions.filter(i => i.level === 'contraindicated')
  const majorInteractions = interactions.filter(i => i.level === 'major')
  const moderateInteractions = interactions.filter(i => i.level === 'moderate')
  
  let safetyLevel: 'safe' | 'caution' | 'unsafe' | 'contraindicated' = 'safe'
  if (criticalInteractions.length > 0) safetyLevel = 'contraindicated'
  else if (majorInteractions.length > 0) safetyLevel = 'unsafe'
  else if (moderateInteractions.length > 0) safetyLevel = 'caution'
  
  const recommendations: string[] = []
  if (criticalInteractions.length > 0) {
    recommendations.push(`🚨 CONTRE-INDICATIONS ABSOLUES DÉTECTÉES: ${criticalInteractions.length}`)
    criticalInteractions.forEach(i => {
      recommendations.push(`   - ${i.description}`)
      recommendations.push(`   - Management: ${i.management}`)
    })
  }
  if (majorInteractions.length > 0) {
    recommendations.push(`⚠️  ${majorInteractions.length} interaction(s) majeure(s) nécessitant surveillance`)
  }
  
  console.log(`   ✓ Checked against ${DRUG_INTERACTIONS_DATABASE.length} known interactions`)
  console.log(`   ⚠️  Found: ${criticalInteractions.length} critical, ${majorInteractions.length} major, ${moderateInteractions.length} moderate`)
  console.log(`   Safety level: ${safetyLevel.toUpperCase()}`)
  
  // 3. CALCULER AJUSTEMENTS POSOLOGIQUES
  console.log('⚖️  Calculating dose adjustments...')
  const medicationsToCheck = gpt4Analysis?.treatment_plan?.medications || []
  const medicationsRequiringAdjustment: Array<{
    medication: string
    adjustments: DoseAdjustment[]
    contraindicated: boolean
  }> = []
  
  let renalFunction: any = undefined
  if (patientContext.creatinine || patientContext.egfr) {
    const egfr = patientContext.egfr || 
      (patientContext.creatinine && patientContext.weight ? 
        calculateEGFR(
          patientContext.creatinine,
          patientContext.age,
          patientContext.sex
        ) : undefined)
    
    if (egfr) {
      let stage = ''
      let recommendation = ''
      if (egfr >= 90) {
        stage = 'G1 (Normal ou élevée)'
        recommendation = 'Pas d\'ajustement généralement nécessaire'
      } else if (egfr >= 60) {
        stage = 'G2 (Légèrement diminuée)'
        recommendation = 'Surveillance mais ajustements rarement nécessaires'
      } else if (egfr >= 45) {
        stage = 'G3a (Modérément diminuée)'
        recommendation = 'Vérifier ajustements posologiques pour médicaments à élimination rénale'
      } else if (egfr >= 30) {
        stage = 'G3b (Modérément à sévèrement diminuée)'
        recommendation = 'AJUSTEMENTS POSOLOGIQUES OBLIGATOIRES - Éviter néphrotoxiques'
      } else if (egfr >= 15) {
        stage = 'G4 (Sévèrement diminuée)'
        recommendation = 'AJUSTEMENTS MAJEURS - Consultation néphrologique - Éviter nombreux médicaments'
      } else {
        stage = 'G5 (Insuffisance rénale terminale)'
        recommendation = 'AJUSTEMENTS CRITIQUES - Avis néphrologique obligatoire - Dialyse probable'
      }
      
      renalFunction = { egfr, stage, recommendation }
    }
  }
  
  for (const med of medicationsToCheck) {
    const drugName = med?.drug || med?.medication_name || ''
    if (!drugName) continue
    
    const adjustments = getAllDoseAdjustments(drugName, {
      age: patientContext.age,
      sex: patientContext.sex,
      weight: patientContext.weight,
      creatinine: patientContext.creatinine,
      egfr: renalFunction?.egfr,
      childPugh: patientContext.childPugh
    })
    
    if (adjustments.length > 0) {
      const isContraindicated = adjustments.some(a => a.contraindicated)
      medicationsRequiringAdjustment.push({
        medication: drugName,
        adjustments,
        contraindicated: isContraindicated
      })
    }
  }
  
  console.log(`   ✓ Checked ${medicationsToCheck.length} medications`)
  console.log(`   ⚠️  ${medicationsRequiringAdjustment.length} require dose adjustments`)
  if (renalFunction) {
    console.log(`   Renal function: eGFR ${renalFunction.egfr} ml/min/1.73m² (${renalFunction.stage})`)
  }
  
  // 4. CALCULER SCORES CLINIQUES APPLICABLES
  console.log('📊 Calculating applicable clinical scores...')
  const applicableScores: ScoreResult[] = []
  
  // Déterminer quels scores sont pertinents
  const complaint = patientContext.chief_complaint.toLowerCase()
  const symptomsText = patientContext.symptoms.join(' ').toLowerCase()
  const allText = `${complaint} ${symptomsText}`
  
  // CURB-65 pour pneumonie
  if ((allText.includes('pneumonia') || allText.includes('pneumonie') || 
       allText.includes('respiratory infection') || allText.includes('cough') && allText.includes('fever')) &&
      patientContext.vital_signs && patientContext.labResults) {
    
    try {
      const bp = patientContext.vital_signs.blood_pressure?.split('/').map(n => parseInt(n)) || [120, 80]
      const score = CLINICAL_SCORES.calculateCURB65({
        confusion: allText.includes('confusion'),
        urea: patientContext.labResults.urea || 5,
        respiratoryRate: patientContext.vital_signs.respiratory_rate || 16,
        bloodPressure: { systolic: bp[0], diastolic: bp[1] },
        age: patientContext.age
      })
      applicableScores.push(score)
    } catch (e) {
      console.log('   ℹ️  Could not calculate CURB-65:', e)
    }
  }
  
  // CHA2DS2-VASc pour FA
  if (allText.includes('atrial fibrillation') || allText.includes('fibrillation auriculaire') || 
      allText.includes('fa') || patientContext.medical_history.some(h => 
        h.toLowerCase().includes('atrial fibrillation'))) {
    
    try {
      const score = CLINICAL_SCORES.calculateCHADS2VASc({
        chf: patientContext.medical_history.some(h => h.toLowerCase().includes('heart failure')),
        hypertension: patientContext.medical_history.some(h => h.toLowerCase().includes('hypertension')),
        age: patientContext.age,
        diabetes: patientContext.medical_history.some(h => h.toLowerCase().includes('diabetes')),
        stroke: patientContext.medical_history.some(h => h.toLowerCase().includes('stroke') || h.toLowerCase().includes('tia')),
        vascularDisease: patientContext.medical_history.some(h => h.toLowerCase().includes('vascular') || h.toLowerCase().includes('infarct')),
        sex: patientContext.sex
      })
      applicableScores.push(score)
    } catch (e) {
      console.log('   ℹ️  Could not calculate CHA2DS2-VASc:', e)
    }
  }
  
  console.log(`   ✓ Calculated ${applicableScores.length} clinical score(s)`)
  
  // 5. ÉVALUATION QUALITÉ GLOBALE
  const qualityAssessment = {
    interactions_checked: true,
    dose_adjustments_checked: medicationsToCheck.length > 0,
    differential_diagnoses_generated: sortedDifferentials.length > 0,
    clinical_scores_applied: applicableScores.length > 0,
    overall_safety_score: calculateOverallSafetyScore(
      safetyLevel,
      medicationsRequiringAdjustment,
      cannotMiss
    )
  }
  
  console.log('✅ Enhanced medical analysis complete')
  console.log(`   Overall safety score: ${qualityAssessment.overall_safety_score}/100`)
  
  return {
    differential_diagnoses: sortedDifferentials,
    cannot_miss_diagnoses: cannotMiss,
    drug_interactions: {
      total_interactions_checked: DRUG_INTERACTIONS_DATABASE.length,
      critical_interactions: criticalInteractions,
      major_interactions: majorInteractions,
      moderate_interactions: moderateInteractions,
      safety_level: safetyLevel,
      recommendations
    },
    dose_adjustments: {
      medications_requiring_adjustment: medicationsRequiringAdjustment,
      renal_function: renalFunction
    },
    clinical_scores: applicableScores,
    quality_assessment: qualityAssessment
  }
}

// ==================== CALCUL SCORE DE SÉCURITÉ GLOBAL ====================
function calculateOverallSafetyScore(
  safetyLevel: string,
  doseAdjustments: any[],
  cannotMiss: any[]
): number {
  let score = 100
  
  // Pénalités interactions
  if (safetyLevel === 'contraindicated') score -= 50
  else if (safetyLevel === 'unsafe') score -= 30
  else if (safetyLevel === 'caution') score -= 15
  
  // Pénalités ajustements non faits
  const contraindicatedMeds = doseAdjustments.filter(d => d.contraindicated).length
  score -= contraindicatedMeds * 20
  score -= (doseAdjustments.length - contraindicatedMeds) * 5
  
  // Bonus si "cannot miss" identifiés
  if (cannotMiss.length > 0) score += 10
  
  return Math.max(0, Math.min(100, score))
}

// ==================== FONCTION D'INTÉGRATION AVEC ANCIEN SYSTÈME ====================
export function integrateEnhancedLogicWithExistingAnalysis(
  existingAnalysis: any,
  enhancedAnalysis: EnhancedMedicalAnalysis
): any {
  console.log('🔗 Integrating enhanced logic with existing analysis...')
  
  // Créer une copie pour ne pas modifier l'original
  const integrated = JSON.parse(JSON.stringify(existingAnalysis))
  
  // Ajouter diagnostics différentiels si manquants ou vides
  if (!integrated.clinical_analysis.differential_diagnoses || 
      integrated.clinical_analysis.differential_diagnoses.length === 0) {
    integrated.clinical_analysis.differential_diagnoses = enhancedAnalysis.differential_diagnoses
  }
  
  // Ajouter section "cannot miss diagnoses"
  integrated.clinical_analysis.cannot_miss_diagnoses = enhancedAnalysis.cannot_miss_diagnoses
  
  // Ajouter analyse interactions
  integrated.advanced_safety = {
    drug_interactions: enhancedAnalysis.drug_interactions,
    dose_adjustments: enhancedAnalysis.dose_adjustments,
    clinical_scores: enhancedAnalysis.clinical_scores
  }
  
  // Mettre à jour niveau de sécurité global
  if (enhancedAnalysis.drug_interactions.safety_level !== 'safe') {
    integrated.safety_alerts = integrated.safety_alerts || []
    integrated.safety_alerts.push(
      ...enhancedAnalysis.drug_interactions.recommendations
    )
  }
  
  // Ajouter warnings pour ajustements posologiques
  const contraindicatedMeds = enhancedAnalysis.dose_adjustments
    .medications_requiring_adjustment.filter(m => m.contraindicated)
  
  if (contraindicatedMeds.length > 0) {
    integrated.safety_alerts = integrated.safety_alerts || []
    contraindicatedMeds.forEach(med => {
      integrated.safety_alerts.push(
        `🚫 ${med.medication}: CONTRE-INDIQUÉ selon fonction rénale/hépatique ou âge`
      )
    })
  }
  
  // Ajouter métadonnées sur l'amélioration
  integrated.enhanced_medical_logic = {
    version: '1.0',
    applied: true,
    quality_assessment: enhancedAnalysis.quality_assessment,
    timestamp: new Date().toISOString()
  }
  
  console.log('✅ Integration complete - Enhanced logic successfully applied')
  
  return integrated
}

// Export des fonctions principales
export {
  DRUG_INTERACTIONS_DATABASE,
  checkDrugInteractions,
  generateDifferentialDiagnoses,
  calculateEGFR,
  CLINICAL_SCORES
}
