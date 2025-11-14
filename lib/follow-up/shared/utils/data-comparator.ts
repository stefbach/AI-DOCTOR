// lib/follow-up/shared/utils/data-comparator.ts
// Utility for comparing medical data between consultations

export interface ComparisonResult {
  previousValue: number | string
  currentValue: number | string
  change: number
  changePercent: number
  trend: 'up' | 'down' | 'stable'
  isImprovement: boolean
  interpretation: string
}

export interface VitalSignsComparison {
  bloodPressure?: {
    systolic: ComparisonResult
    diastolic: ComparisonResult
  }
  weight?: ComparisonResult
  height?: ComparisonResult
  bmi?: ComparisonResult
  bloodGlucose?: ComparisonResult
  temperature?: ComparisonResult
  heartRate?: ComparisonResult
}

/**
 * Calculate change between two numeric values
 */
function calculateChange(previous: number, current: number): {
  change: number
  changePercent: number
  trend: 'up' | 'down' | 'stable'
} {
  const change = current - previous
  const changePercent = previous !== 0 ? (change / previous) * 100 : 0
  
  let trend: 'up' | 'down' | 'stable' = 'stable'
  if (Math.abs(changePercent) > 1) { // More than 1% change
    trend = change > 0 ? 'up' : 'down'
  }
  
  return { change, changePercent, trend }
}

/**
 * Compare blood pressure values
 */
export function compareBloodPressure(
  previousSystolic: number,
  previousDiastolic: number,
  currentSystolic: number,
  currentDiastolic: number
): VitalSignsComparison['bloodPressure'] {
  const systolicComparison = calculateChange(previousSystolic, currentSystolic)
  const diastolicComparison = calculateChange(previousDiastolic, currentDiastolic)
  
  // For BP, lower is better (but not too low)
  const systolicImprovement = 
    (currentSystolic >= 90 && currentSystolic < 120) ||
    (previousSystolic >= 140 && currentSystolic < previousSystolic)
  
  const diastolicImprovement = 
    (currentDiastolic >= 60 && currentDiastolic < 80) ||
    (previousDiastolic >= 90 && currentDiastolic < previousDiastolic)
  
  return {
    systolic: {
      previousValue: previousSystolic,
      currentValue: currentSystolic,
      ...systolicComparison,
      isImprovement: systolicImprovement,
      interpretation: getSystolicInterpretation(currentSystolic)
    },
    diastolic: {
      previousValue: previousDiastolic,
      currentValue: currentDiastolic,
      ...diastolicComparison,
      isImprovement: diastolicImprovement,
      interpretation: getDiastolicInterpretation(currentDiastolic)
    }
  }
}

/**
 * Compare weight values
 */
export function compareWeight(
  previousWeight: number,
  currentWeight: number,
  targetDirection?: 'lose' | 'gain' | 'maintain'
): ComparisonResult {
  const comparison = calculateChange(previousWeight, currentWeight)
  
  let isImprovement = false
  let interpretation = ''
  
  if (targetDirection === 'lose') {
    isImprovement = comparison.trend === 'down'
    interpretation = isImprovement 
      ? `Weight loss of ${Math.abs(comparison.change).toFixed(1)} kg - Good progress!`
      : `Weight ${comparison.trend === 'up' ? 'gained' : 'stable'}`
  } else if (targetDirection === 'gain') {
    isImprovement = comparison.trend === 'up'
    interpretation = isImprovement 
      ? `Weight gain of ${comparison.change.toFixed(1)} kg - Good progress!`
      : `Weight ${comparison.trend === 'down' ? 'lost' : 'stable'}`
  } else {
    isImprovement = comparison.trend === 'stable'
    interpretation = `Weight ${comparison.trend === 'stable' ? 'maintained' : 'changed by ' + Math.abs(comparison.change).toFixed(1) + ' kg'}`
  }
  
  return {
    previousValue: previousWeight,
    currentValue: currentWeight,
    ...comparison,
    isImprovement,
    interpretation
  }
}

/**
 * Compare BMI values
 */
export function compareBMI(
  previousBMI: number,
  currentBMI: number
): ComparisonResult {
  const comparison = calculateChange(previousBMI, currentBMI)
  
  // Improvement means moving toward normal range (18.5-24.9)
  const wasAbnormal = previousBMI < 18.5 || previousBMI >= 25
  const isNowBetter = 
    (previousBMI < 18.5 && currentBMI > previousBMI) || // Was underweight, gaining
    (previousBMI >= 25 && currentBMI < previousBMI) // Was overweight, losing
  
  const isImprovement = wasAbnormal ? isNowBetter : comparison.trend === 'stable'
  
  const category = getBMICategory(currentBMI)
  
  return {
    previousValue: previousBMI,
    currentValue: currentBMI,
    ...comparison,
    isImprovement,
    interpretation: `BMI: ${currentBMI.toFixed(1)} - ${category}`
  }
}

/**
 * Compare blood glucose values
 */
export function compareBloodGlucose(
  previousGlucose: number,
  currentGlucose: number,
  isDiabetic: boolean = false
): ComparisonResult {
  const comparison = calculateChange(previousGlucose, currentGlucose)
  
  const targetRange = isDiabetic 
    ? { min: 0.7, max: 1.3 } // 0.7-1.3 g/L for diabetics (fasting)
    : { min: 0.7, max: 1.1 } // 0.7-1.1 g/L for non-diabetics (fasting)
  
  const wasHigh = previousGlucose > targetRange.max
  const isNowBetter = currentGlucose < previousGlucose && currentGlucose <= targetRange.max
  const isNowInRange = currentGlucose >= targetRange.min && currentGlucose <= targetRange.max
  
  const isImprovement = wasHigh ? isNowBetter : isNowInRange
  
  let interpretation = ''
  if (currentGlucose < targetRange.min) {
    interpretation = '⚠️ Low - Risk of hypoglycemia'
  } else if (currentGlucose <= targetRange.max) {
    interpretation = '✅ Within target range'
  } else {
    interpretation = `⚠️ Elevated - ${((currentGlucose - targetRange.max) / targetRange.max * 100).toFixed(0)}% above target`
  }
  
  return {
    previousValue: previousGlucose,
    currentValue: currentGlucose,
    ...comparison,
    isImprovement,
    interpretation
  }
}

/**
 * Compare all vital signs
 */
export function compareVitalSigns(
  previousVitals: any,
  currentVitals: any,
  patientContext?: { isDiabetic?: boolean; targetWeightDirection?: 'lose' | 'gain' | 'maintain' }
): VitalSignsComparison {
  const comparison: VitalSignsComparison = {}
  
  // Blood Pressure
  if (previousVitals.bloodPressureSystolic && currentVitals.bloodPressureSystolic) {
    comparison.bloodPressure = compareBloodPressure(
      previousVitals.bloodPressureSystolic,
      previousVitals.bloodPressureDiastolic,
      currentVitals.bloodPressureSystolic,
      currentVitals.bloodPressureDiastolic
    )
  }
  
  // Weight
  if (previousVitals.weight && currentVitals.weight) {
    comparison.weight = compareWeight(
      parseFloat(previousVitals.weight),
      parseFloat(currentVitals.weight),
      patientContext?.targetWeightDirection
    )
  }
  
  // BMI
  if (previousVitals.height && currentVitals.height && comparison.weight) {
    const heightM = parseFloat(currentVitals.height) / 100
    const prevBMI = parseFloat(previousVitals.weight) / (heightM * heightM)
    const currBMI = parseFloat(currentVitals.weight) / (heightM * heightM)
    comparison.bmi = compareBMI(prevBMI, currBMI)
  }
  
  // Blood Glucose
  if (previousVitals.bloodGlucose && currentVitals.bloodGlucose) {
    comparison.bloodGlucose = compareBloodGlucose(
      parseFloat(previousVitals.bloodGlucose),
      parseFloat(currentVitals.bloodGlucose),
      patientContext?.isDiabetic
    )
  }
  
  return comparison
}

// Helper functions for interpretations
function getSystolicInterpretation(value: number): string {
  if (value < 90) return 'Low (Hypotension)'
  if (value < 120) return 'Normal'
  if (value < 130) return 'Elevated'
  if (value < 140) return 'Stage 1 Hypertension'
  if (value < 180) return 'Stage 2 Hypertension'
  return 'Hypertensive Crisis'
}

function getDiastolicInterpretation(value: number): string {
  if (value < 60) return 'Low (Hypotension)'
  if (value < 80) return 'Normal'
  if (value < 90) return 'Stage 1 Hypertension'
  if (value < 120) return 'Stage 2 Hypertension'
  return 'Hypertensive Crisis'
}

function getBMICategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 25) return 'Normal weight'
  if (bmi < 30) return 'Overweight'
  if (bmi < 35) return 'Obesity Class I'
  if (bmi < 40) return 'Obesity Class II'
  return 'Obesity Class III'
}
