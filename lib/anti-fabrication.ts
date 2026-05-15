// lib/anti-fabrication.ts
// Detects fabricated physical-examination findings in an LLM response.
// AI Doctor is a TELECONSULTATION app — the doctor never physically
// examines the patient. Yet some models (notably DeepSeek V4-Pro) tend to
// invent "auscultation revealed vesicular breath sounds", "no tonsillar
// exudate", "tympanic membranes clear", etc. This module flags those
// fabrications so the endpoint can either retry with a corrective message
// or surface the violation in logs for downstream A/B analysis.

const FABRICATED_EXAM_PATTERNS: RegExp[] = [
  /palpation\s+of/i,
  /tympanic\s+membrane/i,
  /lymphadenopath/i,
  /auscultation\s+revealed?/i,
  /breath\s+sounds[^.]*(?:vesicular|clear|normal)/i,
  /no\s+purulent\s+(?:nasal\s+)?discharge/i,
  /pharyngeal\s+erythema/i,
  /tonsillar\s+(?:exudate|enlargement)/i,
  /sinus\s+tenderness/i,
  /(?:oxygen\s+saturation|spo2)\s+(?:is|was|of)\s+\d{2,3}/i,
  /capillary\s+refill\s+(?:is|was|less\s+than)/i,
  /(?:cardiac|heart)\s+(?:auscultation|sounds)/i,
  /abdominal\s+(?:palpation|tenderness|guarding|rebound)/i,
  /percussion\s+(?:reveals?|note)/i,
  /chest\s+(?:expansion|wall\s+movement)\s+(?:symmetric|equal)/i,
  /jvp\s+(?:not\s+raised|normal|elevated)/i,
  /no\s+focal\s+neurological\s+(?:deficit|signs?)/i,
  /(?:knee|ankle|biceps|patellar)\s+reflex/i,
]

export interface FabricationCheck {
  fabricationDetected: boolean
  patterns: string[]
  /** Free-text excerpts around each match, for logging */
  excerpts: string[]
}

/**
 * Scan an LLM response for typical fabricated physical-exam phrasing.
 * `hasExamData` should be true ONLY if the request payload included an
 * actual physical examination object (vitals beyond patient self-report,
 * inspection / palpation / auscultation findings provided by the doctor).
 * In a pure teleconsultation, pass `false`.
 */
export function detectFabricatedExam(
  response: string,
  hasExamData: boolean,
): FabricationCheck {
  if (hasExamData || !response) {
    return { fabricationDetected: false, patterns: [], excerpts: [] }
  }
  const matched: string[] = []
  const excerpts: string[] = []
  for (const pattern of FABRICATED_EXAM_PATTERNS) {
    const m = response.match(pattern)
    if (m && m.index !== undefined) {
      matched.push(pattern.source)
      const start = Math.max(0, m.index - 40)
      const end = Math.min(response.length, m.index + m[0].length + 40)
      excerpts.push(response.slice(start, end).replace(/\s+/g, ' ').trim())
    }
  }
  return {
    fabricationDetected: matched.length > 0,
    patterns: matched,
    excerpts,
  }
}

/** Standardised corrective user message appended on retry. */
export const FABRICATION_RETRY_INSTRUCTION =
  'Your previous response fabricated physical examination findings (auscultation, palpation, tympanic membrane inspection, oxygen saturation, etc.). This is a TELECONSULTATION. The doctor never physically examined the patient. Redo your response. For any physical examination section, write exactly: "Physical examination not performed (teleconsultation). Findings limited to patient-reported symptoms." Do not invent any examination data.'
