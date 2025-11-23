// lib/medical/clinical-scores.ts - SCORES CLINIQUES VALIDÉS
// Version 1.0 - Scores essentiels pour pratique clinique

export interface ScoreResult {
  scoreName: string
  score: number
  interpretation: string
  recommendation: string
  riskCategory: 'low' | 'moderate' | 'high' | 'very_high'
  evidence: string
}

// ==================== CURB-65 (Pneumonie communautaire) ====================
export function calculateCURB65(params: {
  confusion: boolean
  urea: number // mmol/L
  respiratoryRate: number
  bloodPressure: { systolic: number, diastolic: number }
  age: number
}): ScoreResult {
  let score = 0
  
  if (params.confusion) score += 1
  if (params.urea > 7) score += 1 // >7 mmol/L = >19 mg/dL
  if (params.respiratoryRate >= 30) score += 1
  if (params.bloodPressure.systolic < 90 || params.bloodPressure.diastolic <= 60) score += 1
  if (params.age >= 65) score += 1
  
  let interpretation: string
  let recommendation: string
  let riskCategory: 'low' | 'moderate' | 'high' | 'very_high'
  
  if (score === 0 || score === 1) {
    interpretation = 'Faible risque de mortalité (<3%)'
    recommendation = 'Traitement ambulatoire possible. Antibiotiques PO.'
    riskCategory = 'low'
  } else if (score === 2) {
    interpretation = 'Risque modéré de mortalité (9%)'
    recommendation = 'Considérer hospitalisation courte ou surveillance rapprochée ambulatoire'
    riskCategory = 'moderate'
  } else if (score === 3) {
    interpretation = 'Risque élevé de mortalité (15-40%)'
    recommendation = 'HOSPITALISATION RECOMMANDÉE. Antibiotiques IV.'
    riskCategory = 'high'
  } else {
    interpretation = 'Risque très élevé de mortalité (>40%)'
    recommendation = 'HOSPITALISATION URGENTE. Considérer soins intensifs. Antibiotiques IV large spectre.'
    riskCategory = 'very_high'
  }
  
  return {
    scoreName: 'CURB-65',
    score,
    interpretation,
    recommendation,
    riskCategory,
    evidence: 'BTS Guidelines 2024, Thorax 2003'
  }
}

// ==================== CRB-65 (Version simplifiée sans urée) ====================
export function calculateCRB65(params: {
  confusion: boolean
  respiratoryRate: number
  bloodPressure: { systolic: number, diastolic: number }
  age: number
}): ScoreResult {
  let score = 0
  
  if (params.confusion) score += 1
  if (params.respiratoryRate >= 30) score += 1
  if (params.bloodPressure.systolic < 90 || params.bloodPressure.diastolic <= 60) score += 1
  if (params.age >= 65) score += 1
  
  let interpretation: string
  let recommendation: string
  let riskCategory: 'low' | 'moderate' | 'high' | 'very_high'
  
  if (score === 0) {
    interpretation = 'Très faible risque'
    recommendation = 'Traitement ambulatoire'
    riskCategory = 'low'
  } else if (score === 1 || score === 2) {
    interpretation = 'Risque intermédiaire'
    recommendation = 'Considérer hospitalisation selon contexte'
    riskCategory = 'moderate'
  } else {
    interpretation = 'Risque élevé'
    recommendation = 'HOSPITALISATION FORTEMENT RECOMMANDÉE'
    riskCategory = 'high'
  }
  
  return {
    scoreName: 'CRB-65',
    score,
    interpretation,
    recommendation,
    riskCategory,
    evidence: 'BTS Guidelines 2024'
  }
}

// ==================== WELLS SCORE (Embolie Pulmonaire) ====================
export function calculateWellsPE(params: {
  clinicalSigns: { dvtSigns: boolean }
  peMoreLikely: boolean
  heartRate: number
  immobilizationOrSurgery: boolean
  previousDvtOrPe: boolean
  hemoptysis: boolean
  cancer: boolean
}): ScoreResult {
  let score = 0
  
  if (params.clinicalSigns.dvtSigns) score += 3
  if (params.peMoreLikely) score += 3
  if (params.heartRate > 100) score += 1.5
  if (params.immobilizationOrSurgery) score += 1.5
  if (params.previousDvtOrPe) score += 1.5
  if (params.hemoptysis) score += 1
  if (params.cancer) score += 1
  
  let interpretation: string
  let recommendation: string
  let riskCategory: 'low' | 'moderate' | 'high' | 'very_high'
  
  if (score <= 4) {
    interpretation = 'Probabilité clinique faible d\'EP (<10%)'
    recommendation = 'D-dimères. Si négatifs: EP exclue. Si positifs: CT angio pulmonaire.'
    riskCategory = 'low'
  } else if (score <= 6) {
    interpretation = 'Probabilité clinique modérée d\'EP (30%)'
    recommendation = 'D-dimères ou directement CT angio pulmonaire selon contexte'
    riskCategory = 'moderate'
  } else {
    interpretation = 'Probabilité clinique élevée d\'EP (>60%)'
    recommendation = 'CT ANGIO PULMONAIRE en URGENCE. Anticoagulation empirique si délai.'
    riskCategory = 'high'
  }
  
  return {
    scoreName: 'Wells Score (EP)',
    score,
    interpretation,
    recommendation,
    riskCategory,
    evidence: 'Ann Intern Med 1998, Lancet 2006'
  }
}

// ==================== WELLS SCORE (TVP) ====================
export function calculateWellsDVT(params: {
  activeCancer: boolean
  paralysisOrImmobilization: boolean
  recentlyBedridden: boolean
  localized Tenderness: boolean
  entireLegSwollen: boolean
  calfSwelling: boolean
  pittingEdema: boolean
  collateralVeins: boolean
  alternativeDiagnosis: boolean
}): ScoreResult {
  let score = 0
  
  if (params.activeCancer) score += 1
  if (params.paralysisOrImmobilization) score += 1
  if (params.recentlyBedridden) score += 1
  if (params.localizedTenderness) score += 1
  if (params.entireLegSwollen) score += 1
  if (params.calfSwelling) score += 1
  if (params.pittingEdema) score += 1
  if (params.collateralVeins) score += 1
  if (params.alternativeDiagnosis) score -= 2
  
  let interpretation: string
  let recommendation: string
  let riskCategory: 'low' | 'moderate' | 'high' | 'very_high'
  
  if (score <= 0) {
    interpretation = 'Probabilité faible de TVP (5%)'
    recommendation = 'D-dimères. Si négatifs: TVP exclue.'
    riskCategory = 'low'
  } else if (score <= 2) {
    interpretation = 'Probabilité modérée de TVP (17%)'
    recommendation: 'D-dimères ou échographie doppler selon contexte'
    riskCategory = 'moderate'
  } else {
    interpretation = 'Probabilité élevée de TVP (53%)'
    recommendation = 'ÉCHOGRAPHIE DOPPLER VEINEUSE en urgence'
    riskCategory = 'high'
  }
  
  return {
    scoreName: 'Wells Score (TVP)',
    score,
    interpretation,
    recommendation,
    riskCategory,
    evidence: 'Lancet 1997, Thromb Haemost 2000'
  }
}

// ==================== CHADS2-VASc (FA - Risque AVC) ====================
export function calculateCHADS2VASc(params: {
  chf: boolean // Insuffisance cardiaque
  hypertension: boolean
  age: number
  diabetes: boolean
  stroke: boolean // AVC/AIT antérieur
  vascularDisease: boolean // Infarctus, AOMI, plaque aortique
  sex: 'M' | 'F' | 'male' | 'female'
}): ScoreResult {
  let score = 0
  
  if (params.chf) score += 1
  if (params.hypertension) score += 1
  if (params.age >= 75) score += 2
  else if (params.age >= 65) score += 1
  if (params.diabetes) score += 1
  if (params.stroke) score += 2
  if (params.vascularDisease) score += 1
  if (params.sex === 'F' || params.sex === 'female') score += 1
  
  let interpretation: string
  let recommendation: string
  let riskCategory: 'low' | 'moderate' | 'high' | 'very_high'
  
  if (score === 0) {
    interpretation = 'Risque très faible d\'AVC (0-0.2%/an)'
    recommendation = 'Pas d\'anticoagulation nécessaire'
    riskCategory = 'low'
  } else if (score === 1) {
    interpretation = 'Risque faible d\'AVC (0.6-1.3%/an)'
    recommendation = 'Considérer anticoagulation (balance bénéfice/risque)'
    riskCategory = 'moderate'
  } else if (score === 2) {
    interpretation = 'Risque modéré d\'AVC (2.2%/an)'
    recommendation = 'ANTICOAGULATION RECOMMANDÉE (AOD ou AVK)'
    riskCategory = 'moderate'
  } else {
    interpretation = `Risque élevé d\'AVC (${score >= 5 ? '>6' : '3-6'}%/an)`
    recommendation = 'ANTICOAGULATION FORTEMENT RECOMMANDÉE'
    riskCategory = 'high'
  }
  
  return {
    scoreName: 'CHA2DS2-VASc',
    score,
    interpretation,
    recommendation,
    riskCategory,
    evidence: 'ESC AF Guidelines 2024'
  }
}

// ==================== HAS-BLED (Risque hémorragique sous anticoagulants) ====================
export function calculateHASBLED(params: {
  hypertension: boolean // TAS >160
  abnormalRenalFunction: boolean // Dialyse, créat >200
  abnormalLiverFunction: boolean
  stroke: boolean
  bleeding: boolean // Antécédents hémorragie ou prédisposition
  labileINR: boolean // TTR <60%
  elderly: boolean // >65 ans
  drugs: boolean // Antiplaquettaires, AINS
  alcohol: boolean // >8 verres/semaine
}): ScoreResult {
  let score = 0
  
  if (params.hypertension) score += 1
  if (params.abnormalRenalFunction) score += 1
  if (params.abnormalLiverFunction) score += 1
  if (params.stroke) score += 1
  if (params.bleeding) score += 1
  if (params.labileINR) score += 1
  if (params.elderly) score += 1
  if (params.drugs) score += 1
  if (params.alcohol) score += 1
  
  let interpretation: string
  let recommendation: string
  let riskCategory: 'low' | 'moderate' | 'high' | 'very_high'
  
  if (score <= 2) {
    interpretation = `Risque faible d\'hémorragie majeure (${score === 0 ? '1.1' : score === 1 ? '1.0' : '1.9'}%/an)`
    recommendation = 'Anticoagulation sûre si indiquée'
    riskCategory = 'low'
  } else if (score === 3) {
    interpretation = 'Risque modéré d\'hémorragie (3.7%/an)'
    recommendation = 'Anticoagulation possible avec PRÉCAUTIONS. Corriger facteurs modifiables.'
    riskCategory = 'moderate'
  } else {
    interpretation = `Risque élevé d\'hémorragie (${score === 4 ? '8.7' : '>10'}%/an)`
    recommendation = 'PRUDENCE. Balance bénéfice/risque. Corriger facteurs de risque. Surveillance étroite.'
    riskCategory = 'high'
  }
  
  return {
    scoreName: 'HAS-BLED',
    score,
    interpretation,
    recommendation,
    riskCategory,
    evidence: 'Chest 2010, ESC 2024'
  }
}

// ==================== ALVARADO SCORE (Appendicite) ====================
export function calculateAlvarado(params: {
  migratoryPain: boolean // Douleur migrant vers FID
  anorexia: boolean
  nausea: boolean
  tendernessRIF: boolean // Sensibilité FID
  reboundPain: boolean // Défense
  fever: boolean // >37.3°C
  leukocytosis: boolean // GB >10,000
  shiftToLeft: boolean // PNN >75%
}): ScoreResult {
  let score = 0
  
  if (params.migratoryPain) score += 1
  if (params.anorexia) score += 1
  if (params.nausea) score += 1
  if (params.tendernessRIF) score += 2
  if (params.reboundPain) score += 1
  if (params.fever) score += 1
  if (params.leukocytosis) score += 2
  if (params.shiftToLeft) score += 1
  
  let interpretation: string
  let recommendation: string
  let riskCategory: 'low' | 'moderate' | 'high' | 'very_high'
  
  if (score <= 4) {
    interpretation = 'Appendicite peu probable (<25%)'
    recommendation = 'Observation ou retour domicile avec consignes. Réévaluation si aggravation.'
    riskCategory = 'low'
  } else if (score <= 6) {
    interpretation = 'Appendicite possible (50%)'
    recommendation = 'IMAGERIE (échographie ou CT). Observation hospitalière.'
    riskCategory = 'moderate'
  } else {
    interpretation = 'Appendicite très probable (>80%)'
    recommendation = 'CHIRURGIE (appendicectomie). Imagerie optionnelle.'
    riskCategory = 'high'
  }
  
  return {
    scoreName: 'Alvarado Score',
    score,
    interpretation,
    recommendation,
    riskCategory,
    evidence: 'Ann Emerg Med 1986, Meta-analysis 2011'
  }
}

// ==================== CENTOR SCORE (Pharyngite streptococcique) ====================
export function calculateCentor(params: {
  fever: boolean // >38°C
  tonsillarExudate: boolean // Exsudat amygdalien
  swollenTenderNodes: boolean // Adénopathies cervicales
  noCough: boolean
  age: number
}): ScoreResult {
  let score = 0
  
  if (params.fever) score += 1
  if (params.tonsillarExudate) score += 1
  if (params.swollenTenderNodes) score += 1
  if (params.noCough) score += 1
  
  // Modification McIsaac (avec âge)
  if (params.age < 15) score += 1
  else if (params.age >= 45) score -= 1
  
  let interpretation: string
  let recommendation: string
  let riskCategory: 'low' | 'moderate' | 'high' | 'very_high'
  
  if (score <= 0) {
    interpretation = 'Probabilité très faible streptocoque (1-2%)'
    recommendation = 'Pas de test ni antibiotique. Traitement symptomatique.'
    riskCategory = 'low'
  } else if (score === 1) {
    interpretation = 'Probabilité faible (5-10%)'
    recommendation = 'Pas de test ni antibiotique généralement'
    riskCategory = 'low'
  } else if (score === 2 || score === 3) {
    interpretation = 'Probabilité modérée (15-35%)'
    recommendation = 'TEST DE DÉPISTAGE RAPIDE (TDR) ou culture. Antibiotiques si positif.'
    riskCategory = 'moderate'
  } else {
    interpretation = 'Probabilité élevée (50-60%)'
    recommendation = 'TDR ou traitement antibiotique empirique (Amoxicilline 1g BD 6 jours)'
    riskCategory = 'high'
  }
  
  return {
    scoreName: 'Centor Score (McIsaac modifié)',
    score,
    interpretation,
    recommendation,
    riskCategory,
    evidence: 'Med Decis Making 1981, CMAJ 2004'
  }
}

// ==================== OTTAWA ANKLE RULES (Fracture cheville) ====================
export function calculateOttawaAnkle(params: {
  boneGainTenderness1: boolean // Malléole externe - 6cm distaux
  boneGainTenderness2: boolean // Malléole interne - 6cm distaux
  boneGainTenderness3: boolean // Base 5e métatarse
  boneGainTenderness4: boolean // Naviculaire
  unableToWalk: boolean // Impossibilité 4 pas immédiatement et aux urgences
}): ScoreResult {
  const needsXray = 
    params.boneGainTenderness1 || 
    params.boneGainTenderness2 || 
    params.boneGainTenderness3 || 
    params.boneGainTenderness4 || 
    params.unableToWalk
  
  let interpretation: string
  let recommendation: string
  let riskCategory: 'low' | 'moderate' | 'high' | 'very_high'
  
  if (!needsXray) {
    interpretation = 'Probabilité de fracture <1%'
    recommendation = 'RADIOGRAPHIE NON NÉCESSAIRE. RICE protocol (Repos, Glace, Compression, Élévation)'
    riskCategory = 'low'
  } else {
    interpretation = 'Fracture possible'
    recommendation = 'RADIOGRAPHIE CHEVILLE recommandée (face + profil + mortaise)'
    riskCategory = 'moderate'
  }
  
  return {
    scoreName: 'Ottawa Ankle Rules',
    score: needsXray ? 1 : 0,
    interpretation,
    recommendation,
    riskCategory,
    evidence: 'JAMA 1993, Systematic review 2003. Sensibilité 98%, spécificité 50%'
  }
}

// ==================== GRACE SCORE (SCA - Risque mortalité hospitalière) ====================
export function calculateGRACE(params: {
  age: number
  heartRate: number
  systolicBP: number
  creatinine: number // µmol/L
  killipClass: 1 | 2 | 3 | 4
  cardiacArrest: boolean
  stElevation: boolean
  elevatedCardiacMarkers: boolean
}): ScoreResult {
  let score = 0
  
  // Age
  if (params.age < 40) score += 0
  else if (params.age <= 49) score += 18
  else if (params.age <= 59) score += 36
  else if (params.age <= 69) score += 55
  else if (params.age <= 79) score += 73
  else score += 91
  
  // FC
  if (params.heartRate < 70) score += 0
  else if (params.heartRate <= 89) score += 7
  else if (params.heartRate <= 109) score += 13
  else if (params.heartRate <= 149) score += 23
  else score += 36
  
  // TAS
  if (params.systolicBP < 80) score += 63
  else if (params.systolicBP <= 99) score += 58
  else if (params.systolicBP <= 119) score += 47
  else if (params.systolicBP <= 139) score += 37
  else if (params.systolicBP <= 159) score += 26
  else if (params.systolicBP <= 199) score += 11
  else score += 0
  
  // Créatinine (approximation)
  const creatMgDl = params.creatinine / 88.4
  if (creatMgDl < 0.4) score += 2
  else if (creatMgDl <= 0.79) score += 5
  else if (creatMgDl <= 1.19) score += 8
  else if (creatMgDl <= 1.59) score += 11
  else if (creatMgDl <= 1.99) score += 14
  else if (creatMgDl <= 3.99) score += 23
  else score += 31
  
  // Killip
  if (params.killipClass === 2) score += 21
  else if (params.killipClass === 3) score += 43
  else if (params.killipClass === 4) score += 64
  
  // Arrêt cardiaque
  if (params.cardiacArrest) score += 43
  
  // ST elevation
  if (params.stElevation) score += 15
  
  // Marqueurs cardiaques
  if (params.elevatedCardiacMarkers) score += 15
  
  let interpretation: string
  let recommendation: string
  let riskCategory: 'low' | 'moderate' | 'high' | 'very_high'
  
  if (score <= 108) {
    interpretation = 'Risque faible de mortalité hospitalière (<1%)'
    recommendation = 'Stratégie conservatrice possible'
    riskCategory = 'low'
  } else if (score <= 140) {
    interpretation = 'Risque intermédiaire (1-3%)'
    recommendation = 'Stratégie invasive précoce recommandée'
    riskCategory = 'moderate'
  } else if (score <= 180) {
    interpretation = 'Risque élevé (3-8%)'
    recommendation = 'STRATÉGIE INVASIVE URGENTE. Coronarographie <24h'
    riskCategory = 'high'
  } else {
    interpretation = 'Risque très élevé (>8%)'
    recommendation = 'STRATÉGIE INVASIVE IMMÉDIATE. Soins intensifs. Coronarographie urgente.'
    riskCategory = 'very_high'
  }
  
  return {
    scoreName: 'GRACE Score',
    score,
    interpretation,
    recommendation,
    riskCategory,
    evidence: 'Circulation 2003, JAMA 2004'
  }
}

// Export all calculator functions
export const CLINICAL_SCORES = {
  calculateCURB65,
  calculateCRB65,
  calculateWellsPE,
  calculateWellsDVT,
  calculateCHADS2VASc,
  calculateHASBLED,
  calculateAlvarado,
  calculateCentor,
  calculateOttawaAnkle,
  calculateGRACE
}
