export const DIAGNOSTIC_QUESTIONS_BY_SYSTEM: Record<string, string[]> = {
  ear: [
    'Do you have hearing loss?',
    'Is there any ear discharge?',
    'Have you had recent upper respiratory infection?'
  ],
  urinary: [
    'Do you experience burning when urinating?',
    'Have you noticed blood in your urine?',
    'Are you urinating more frequently than usual?'
  ],
  throat: [
    'Do you have difficulty swallowing?',
    'Is your throat sore or painful?',
    'Any hoarseness or voice changes?'
  ]
}

const SYMPTOM_KEYWORDS: Record<string, string[]> = {
  ear: ['ear', 'otit', 'hearing'],
  urinary: ['urinary', 'urine', 'dysuria', 'cyst', 'uti'],
  throat: ['throat', 'pharyng', 'gorge', 'tonsil', 'sore throat']
}

export function selectDiagnosticQuestionResponses(
  symptoms: string[],
  responses: Array<{ question: string; answer: string }>
) {
  const lowerSymptoms = symptoms.map(s => s.toLowerCase())
  const systems = Object.keys(SYMPTOM_KEYWORDS).filter(system =>
    lowerSymptoms.some(sym => SYMPTOM_KEYWORDS[system].some(k => sym.includes(k)))
  )

  const selected: Array<{ question: string; answer: string }> = []

  systems.forEach(system => {
    const questions = DIAGNOSTIC_QUESTIONS_BY_SYSTEM[system] || []
    questions.forEach(q => {
      const found = responses.find(r => r.question === q)
      if (found) {
        selected.push({ question: found.question, answer: String(found.answer) })
      }
    })
  })

  return selected
}
