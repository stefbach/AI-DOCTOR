export interface ConsultationAnalysis {
  consultationType: 'renewal' | 'new_problem' | 'mixed'
  renewalKeywords: string[]
  confidence: number
}

export function analyzeConsultationType(
  currentMedications: string[],
  chiefComplaint: unknown,
  symptoms: string[],
): ConsultationAnalysis {
  const renewalKeywords = [
    'renouvellement', 'renouveler', 'même traitement', 'continuer', 'ordonnance',
    'renewal', 'refill', 'same medication', 'usual', 'chronic', 'chronique',
    'prescription', 'continue', 'poursuivre', 'maintenir', 'repeat'
  ]

  if (typeof chiefComplaint !== 'string') {
    console.warn('analyzeConsultationType expected chiefComplaint to be a string')
  }
  const chiefComplaintStr =
    typeof chiefComplaint === 'string' ? chiefComplaint : ''
  const chiefComplaintLower = chiefComplaintStr.toLowerCase()
  const symptomsLower = symptoms.join(' ').toLowerCase()
  const allText = `${chiefComplaintLower} ${symptomsLower}`

  const foundKeywords = renewalKeywords.filter(keyword =>
    allText.includes(keyword.toLowerCase()),
  )

  let consultationType: ConsultationAnalysis['consultationType'] = 'new_problem'
  let confidence = 0

  if (foundKeywords.length >= 2 && currentMedications.length > 0) {
    consultationType = 'renewal'
    confidence = Math.min(0.9, 0.3 + foundKeywords.length * 0.2)
  } else if (foundKeywords.length >= 1 && currentMedications.length > 0) {
    consultationType = 'mixed'
    confidence = 0.6
  } else {
    consultationType = 'new_problem'
    confidence = 0.8
  }

  return { consultationType, renewalKeywords: foundKeywords, confidence }
}
