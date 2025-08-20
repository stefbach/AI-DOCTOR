export interface DiagnosticCriteria {
  symptoms: string[]
}

export const DIAGNOSTIC_CRITERIA_DATABASE: Record<string, DiagnosticCriteria> = {
  flu: { symptoms: ['fever', 'cough', 'sore throat'] },
  cold: { symptoms: ['sneezing', 'runny nose', 'cough'] },
  migraine: { symptoms: ['headache', 'nausea', 'light sensitivity'] }
}

export interface DiagnosticValidation {
  isValid: boolean
  missingSymptoms: string[]
  score: number
}

export function validateDiagnosisAgainstSymptoms(
  diagnosis: string,
  symptoms: string[]
): DiagnosticValidation {
  const key = diagnosis.toLowerCase()
  const criteria = DIAGNOSTIC_CRITERIA_DATABASE[key]
  if (!criteria) {
    return { isValid: true, missingSymptoms: [], score: 1 }
  }
  const required = criteria.symptoms
  const present = symptoms.map(s => s.toLowerCase())
  const missing = required.filter(sym => !present.some(p => p.includes(sym)))
  const score = (required.length - missing.length) / required.length
  return { isValid: missing.length === 0, missingSymptoms: missing, score }
}
