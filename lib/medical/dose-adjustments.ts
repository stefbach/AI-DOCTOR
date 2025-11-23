// lib/medical/dose-adjustments.ts - AJUSTEMENTS POSOLOGIQUES
// Version 1.0 - Ajustements rénal, hépatique, gériatrique

export interface DoseAdjustment {
  reason: string
  originalDose: string
  adjustedDose: string
  adjustmentType: 'renal' | 'hepatic' | 'geriatric' | 'weight' | 'pregnancy'
  severity: 'critical' | 'important' | 'moderate'
  recommendation: string
  contraindicated?: boolean
}

// ==================== CALCUL eGFR (CKD-EPI) ====================
export function calculateEGFR(
  creatinine: number, // en µmol/L
  age: number,
  sex: 'M' | 'F' | 'male' | 'female',
  race: 'black' | 'non-black' = 'non-black'
): number {
  // Convertir créatinine µmol/L en mg/dL
  const creatMgDl = creatinine / 88.4
  
  const sexNormalized = sex === 'M' || sex === 'male' ? 'M' : 'F'
  
  // Formule CKD-EPI
  const kappa = sexNormalized === 'F' ? 0.7 : 0.9
  const alpha = sexNormalized === 'F' ? -0.329 : -0.411
  const sexFactor = sexNormalized === 'F' ? 1.018 : 1.0
  const raceFactor = race === 'black' ? 1.159 : 1.0
  
  const ratio = creatMgDl / kappa
  const minRatio = Math.min(ratio, 1)
  const maxRatio = Math.max(ratio, 1)
  
  const eGFR = 141 * 
    Math.pow(minRatio, alpha) * 
    Math.pow(maxRatio, -1.209) * 
    Math.pow(0.993, age) * 
    sexFactor * 
    raceFactor
  
  return Math.round(eGFR)
}

// ==================== CALCUL COCKROFT-GAULT ====================
export function calculateCockcroftGault(
  creatinine: number, // en µmol/L
  age: number,
  weight: number, // en kg
  sex: 'M' | 'F' | 'male' | 'female'
): number {
  const sexNormalized = sex === 'M' || sex === 'male' ? 'M' : 'F'
  const sexFactor = sexNormalized === 'F' ? 0.85 : 1.0
  
  // CrCl (ml/min) = [(140 - age) × weight × sexFactor] / (créat en µmol/L)
  const crCl = ((140 - age) * weight * sexFactor) / creatinine
  
  return Math.round(crCl)
}

// ==================== BASE DE DONNÉES AJUSTEMENTS RÉNAUX ====================
interface RenalAdjustmentRule {
  drug: string[]
  egfr_30_60: string
  egfr_15_30: string
  egfr_less_15: string
  dialysis?: string
  monitoring: string
}

const RENAL_ADJUSTMENTS: RenalAdjustmentRule[] = [
  {
    drug: ['metformin', 'metformine'],
    egfr_30_60: 'Réduire dose 50% - Max 1000mg/j - Surveillance étroite',
    egfr_15_30: 'CONTRE-INDIQUÉ - Risque acidose lactique',
    egfr_less_15: 'CONTRE-INDICATION ABSOLUE',
    monitoring: 'Créatinine tous les 3 mois. Arrêt si infection sévère ou déshydratation'
  },
  {
    drug: ['enoxaparin', 'enoxaparine'],
    egfr_30_60: 'Dose standard possible mais surveillance',
    egfr_15_30: 'Réduire 50% - 1mg/kg/j → 0.5mg/kg/j',
    egfr_less_15: 'Réduire 50% ou préférer HNF',
    dialysis: 'HNF préférée (monitoring aPTT)',
    monitoring: 'Anti-Xa si disponible, surveillance saignements'
  },
  {
    drug: ['gabapentin', 'gabapentine'],
    egfr_30_60: 'Réduire 50% - 300mg TDS → 300mg BD',
    egfr_15_30: 'Réduire 75% - 300mg OD',
    egfr_less_15: '100-300mg OD ou post-dialyse',
    monitoring: 'Surveillance sédation, vertiges'
  },
  {
    drug: ['digoxin', 'digoxine'],
    egfr_30_60: 'Réduire dose 25% - Digoxinémie obligatoire',
    egfr_15_30: 'Réduire dose 50% - Digoxinémie fréquente',
    egfr_less_15: 'Réduire dose 75% ou arrêt - Risque toxicité élevé',
    monitoring: 'Digoxinémie cible 0.5-0.9 ng/mL (pas 0.8-2.0)'
  },
  {
    drug: ['ains', 'nsaids', 'ibuprofen', 'ibuprofène', 'diclofenac', 'diclofénac'],
    egfr_30_60: 'ÉVITER - Risque d\'aggravation fonction rénale',
    egfr_15_30: 'CONTRE-INDIQUÉ',
    egfr_less_15: 'CONTRE-INDICATION ABSOLUE',
    monitoring: 'Préférer paracétamol. Si obligatoire: créatinine à J3-5'
  },
  {
    drug: ['amoxicillin', 'amoxicilline'],
    egfr_30_60: 'Dose standard 500mg TDS possible',
    egfr_15_30: 'Réduire fréquence: 500mg BD',
    egfr_less_15: '500mg OD ou BD selon sévérité',
    monitoring: 'Adaptation selon réponse clinique'
  },
  {
    drug: ['ciprofloxacin', 'ciprofloxacine'],
    egfr_30_60: 'Dose standard ou réduire 50%',
    egfr_15_30: 'Réduire 50%',
    egfr_less_15: 'Réduire 50% et augmenter intervalle',
    monitoring: 'Ototoxicité, tendinopathie'
  },
  {
    drug: ['gentamicin', 'gentamicine', 'aminoglycosides'],
    egfr_30_60: 'Dose selon nomogramme - Dosages obligatoires',
    egfr_15_30: 'Dose selon dosages - Prolonger intervalle',
    egfr_less_15: 'Éviter si possible - Si obligatoire: dosages rapprochés',
    monitoring: 'Dosages pic et vallée OBLIGATOIRES. Fonction rénale quotidienne'
  },
  {
    drug: ['acei', 'iec', 'ramipril', 'perindopril', 'périndopril'],
    egfr_30_60: 'Dose normale - Surveillance créatinine',
    egfr_15_30: 'Débuter dose faible - Titration prudente',
    egfr_less_15: 'Éviter si possible ou doses très faibles',
    monitoring: 'Créatinine et K+ à J3-7 puis mensuel. Arrêt si créat augmente >30%'
  },
  {
    drug: ['spironolactone'],
    egfr_30_60: 'Max 25mg/j - K+ surveillance étroite',
    egfr_15_30: 'ÉVITER - Risque hyperkaliémie majeur',
    egfr_less_15: 'CONTRE-INDICATION',
    monitoring: 'K+ à J3, J7, puis hebdomadaire'
  }
]

// ==================== AJUSTEMENTS HÉPATIQUES (Child-Pugh) ====================
export type ChildPughClass = 'A' | 'B' | 'C'

export function calculateChildPugh(
  bilirubin: number, // mg/dL
  albumin: number, // g/dL
  inr: number,
  ascites: 'none' | 'mild' | 'moderate',
  encephalopathy: 'none' | 'grade1-2' | 'grade3-4'
): { score: number, class: ChildPughClass } {
  let score = 0
  
  // Bilirubine
  if (bilirubin < 2) score += 1
  else if (bilirubin <= 3) score += 2
  else score += 3
  
  // Albumine
  if (albumin > 3.5) score += 1
  else if (albumin >= 2.8) score += 2
  else score += 3
  
  // INR
  if (inr < 1.7) score += 1
  else if (inr <= 2.3) score += 2
  else score += 3
  
  // Ascite
  if (ascites === 'none') score += 1
  else if (ascites === 'mild') score += 2
  else score += 3
  
  // Encéphalopathie
  if (encephalopathy === 'none') score += 1
  else if (encephalopathy === 'grade1-2') score += 2
  else score += 3
  
  let childClass: ChildPughClass
  if (score <= 6) childClass = 'A'
  else if (score <= 9) childClass = 'B'
  else childClass = 'C'
  
  return { score, class: childClass }
}

interface HepaticAdjustmentRule {
  drug: string[]
  child_pugh_A: string
  child_pugh_B: string
  child_pugh_C: string
  monitoring: string
}

const HEPATIC_ADJUSTMENTS: HepaticAdjustmentRule[] = [
  {
    drug: ['paracetamol', 'paracétamol', 'acetaminophen'],
    child_pugh_A: 'Dose normale - Max 4g/j',
    child_pugh_B: 'Réduire dose 50% - Max 2g/j',
    child_pugh_C: 'Éviter ou max 1g/j - Risque hépatotoxicité majeur',
    monitoring: 'Transaminases si usage prolongé'
  },
  {
    drug: ['metformin', 'metformine'],
    child_pugh_A: 'Dose normale',
    child_pugh_B: 'CONTRE-INDIQUÉ - Risque acidose lactique',
    child_pugh_C: 'CONTRE-INDICATION ABSOLUE',
    monitoring: 'Lactates si signes d\'alerte'
  },
  {
    drug: ['statins', 'statines', 'atorvastatin', 'atorvastatine', 'simvastatin'],
    child_pugh_A: 'Dose normale - Surveillance transaminases',
    child_pugh_B: 'Réduire dose 50% ou éviter',
    child_pugh_C: 'CONTRE-INDIQUÉ',
    monitoring: 'Transaminases mensuelles si Child B'
  },
  {
    drug: ['warfarin', 'warfarine'],
    child_pugh_A: 'Dose normale - INR surveillance standard',
    child_pugh_B: 'Débuter dose faible - INR très fréquent',
    child_pugh_C: 'Éviter si possible - Risque hémorragique majeur',
    monitoring: 'INR tous les 2-3 jours en début, puis hebdomadaire'
  },
  {
    drug: ['morphine', 'opioids', 'opioïdes'],
    child_pugh_A: 'Dose normale',
    child_pugh_B: 'Réduire dose 25-50% - Prolongation effet',
    child_pugh_C: 'Réduire dose 50-75% - Risque encéphalopathie',
    monitoring: 'Sédation, fonction cognitive'
  }
]

// ==================== AJUSTEMENTS GÉRIATRIQUES ====================
interface GeriatricAdjustmentRule {
  drug: string[]
  recommendation: string
  beers_criteria: boolean
  alternative?: string
}

const GERIATRIC_ADJUSTMENTS: GeriatricAdjustmentRule[] = [
  {
    drug: ['benzodiazepines', 'benzodiazépines', 'diazepam', 'lorazepam'],
    recommendation: 'ÉVITER chez >65 ans - Risque chutes x2, confusion, dépendance',
    beers_criteria: true,
    alternative: 'Traitement non pharmacologique insomnie. Si obligatoire: zopiclone courte durée'
  },
  {
    drug: ['anticholinergics', 'anticholinergiques'],
    recommendation: 'ÉVITER - Risque confusion, rétention urinaire, chutes',
    beers_criteria: true,
    alternative: 'Alternatives non anticholinergiques'
  },
  {
    drug: ['nsaids', 'ains', 'ibuprofen'],
    recommendation: 'ÉVITER usage chronique - Risque GI bleeding, IRA, IC',
    beers_criteria: true,
    alternative: 'Paracétamol 1ère intention. Opioïdes faibles si insuffisant'
  },
  {
    drug: ['first-generation antihistamines', 'diphenhydramine'],
    recommendation: 'ÉVITER - Effet anticholinergique fort',
    beers_criteria: true,
    alternative: 'Cétirizine, loratadine (antihistaminiques H1 2e génération)'
  },
  {
    drug: ['amitriptyline', 'tricycliques'],
    recommendation: 'ÉVITER - Anticholinergique + cardiotoxique',
    beers_criteria: true,
    alternative: 'ISRS (sertraline, citalopram) ou IRSN'
  },
  {
    drug: ['digoxin', 'digoxine'],
    recommendation: 'Dose >125µg/j ÉVITER - Toxicité fréquente chez âgés',
    beers_criteria: true,
    alternative: 'Si IC: max 125µg/j, digoxinémie cible 0.5-0.9 ng/mL'
  }
]

// ==================== FONCTIONS PRINCIPALES ====================
export function adjustDoseForRenalFunction(
  drug: string,
  egfr: number
): DoseAdjustment | null {
  const drugLower = drug.toLowerCase()
  
  for (const rule of RENAL_ADJUSTMENTS) {
    if (rule.drug.some(d => drugLower.includes(d))) {
      let adjustment: string
      let severity: 'critical' | 'important' | 'moderate'
      let contraindicated = false
      
      if (egfr >= 60) {
        return null // Pas d'ajustement nécessaire
      } else if (egfr >= 30) {
        adjustment = rule.egfr_30_60
        severity = 'moderate'
      } else if (egfr >= 15) {
        adjustment = rule.egfr_15_30
        severity = 'important'
      } else {
        adjustment = rule.egfr_less_15
        severity = 'critical'
      }
      
      if (adjustment.includes('CONTRE-INDICATION') || adjustment.includes('CONTRE-INDIQUÉ')) {
        contraindicated = true
      }
      
      return {
        reason: `Insuffisance rénale modérée à sévère (eGFR ${egfr} ml/min/1.73m²)`,
        originalDose: 'Dose standard',
        adjustedDose: adjustment,
        adjustmentType: 'renal',
        severity,
        recommendation: rule.monitoring,
        contraindicated
      }
    }
  }
  
  return null
}

export function adjustDoseForHepaticFunction(
  drug: string,
  childPugh: ChildPughClass
): DoseAdjustment | null {
  const drugLower = drug.toLowerCase()
  
  for (const rule of HEPATIC_ADJUSTMENTS) {
    if (rule.drug.some(d => drugLower.includes(d))) {
      if (childPugh === 'A') {
        return null // Généralement pas d'ajustement
      }
      
      let adjustment: string
      let severity: 'critical' | 'important' | 'moderate'
      let contraindicated = false
      
      if (childPugh === 'B') {
        adjustment = rule.child_pugh_B
        severity = 'important'
      } else {
        adjustment = rule.child_pugh_C
        severity = 'critical'
      }
      
      if (adjustment.includes('CONTRE-INDICATION') || adjustment.includes('CONTRE-INDIQUÉ')) {
        contraindicated = true
      }
      
      return {
        reason: `Insuffisance hépatique Child-Pugh ${childPugh}`,
        originalDose: 'Dose standard',
        adjustedDose: adjustment,
        adjustmentType: 'hepatic',
        severity,
        recommendation: rule.monitoring,
        contraindicated
      }
    }
  }
  
  return null
}

export function checkGeriatricAppropriate(
  drug: string,
  age: number
): DoseAdjustment | null {
  if (age < 65) return null
  
  const drugLower = drug.toLowerCase()
  
  for (const rule of GERIATRIC_ADJUSTMENTS) {
    if (rule.drug.some(d => drugLower.includes(d))) {
      return {
        reason: `Patient âgé ≥65 ans - Beers Criteria`,
        originalDose: 'Dose adulte standard',
        adjustedDose: rule.recommendation,
        adjustmentType: 'geriatric',
        severity: 'important',
        recommendation: rule.alternative || 'Considérer alternatives',
        contraindicated: rule.recommendation.includes('ÉVITER')
      }
    }
  }
  
  return null
}

// Fonction combinée pour tous les ajustements
export function getAllDoseAdjustments(
  drug: string,
  patientData: {
    age: number
    weight?: number
    sex: 'M' | 'F' | 'male' | 'female'
    creatinine?: number // µmol/L
    egfr?: number
    childPugh?: ChildPughClass
  }
): DoseAdjustment[] {
  const adjustments: DoseAdjustment[] = []
  
  // Ajustement rénal
  if (patientData.egfr || (patientData.creatinine && patientData.weight)) {
    const egfr = patientData.egfr || 
      calculateCockcroftGault(
        patientData.creatinine!,
        patientData.age,
        patientData.weight!,
        patientData.sex
      )
    
    const renalAdjust = adjustDoseForRenalFunction(drug, egfr)
    if (renalAdjust) adjustments.push(renalAdjust)
  }
  
  // Ajustement hépatique
  if (patientData.childPugh) {
    const hepaticAdjust = adjustDoseForHepaticFunction(drug, patientData.childPugh)
    if (hepaticAdjust) adjustments.push(hepaticAdjust)
  }
  
  // Ajustement gériatrique
  const geriatricAdjust = checkGeriatricAppropriate(drug, patientData.age)
  if (geriatricAdjust) adjustments.push(geriatricAdjust)
  
  return adjustments
}
