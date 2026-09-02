// lib/patient-normalisation.ts
//
// Two patient fields reach this codebase under half a dozen names each, and
// when the nurse-led handoff replaced the patient form as the source of step 0
// they started arriving under names nothing read.
//
// On 01/09 that cost a 62-year-old hypertensive, coronary patient his age and
// his three regular medicines: the RAG query went out as "paediatric patient
// (0 years old)" and the model prescribed Mebeverine and Omeprazole without
// ever seeing his Amlodipine, Atorvastatin and Colopido-grêle.
//
// These helpers are the single place that knows every spelling. Read patient
// age and current medications through them, never off a single property.

const AGE_KEYS = ['age', 'Age', 'patientAge', 'patient_age'] as const

const BIRTH_DATE_KEYS = [
  'birthDate',
  'dateOfBirth',
  'date_of_birth',
  'dateNaissance',
  'date_naissance',
  'birth_date',
  'dob',
] as const

const MEDICATION_ARRAY_KEYS = [
  'currentMedications',
  'current_medications',
  'medicationsActuelles',
  'medications',
] as const

const MEDICATION_TEXT_KEYS = [
  'currentMedicationsText',
  'current_medications_text',
  'medicamentsActuels',
  'currentMedications',
  'current_medications',
] as const

/** Placeholders the forms write when there is nothing to declare. */
const NOTHING_TO_DECLARE = new Set([
  'none',
  'nil',
  'n/a',
  'na',
  'aucun',
  'aucune',
  'aucun traitement',
  'pas de traitement',
  'no medication',
  'no medications',
  'not specified',
  'non spécifié',
  'non specifie',
])

/** Age in whole years from a date of birth, or null when the date is unusable. */
export function ageFromBirthDate(value: unknown): number | null {
  if (!value || typeof value !== 'string') return null

  const birth = new Date(value)
  if (Number.isNaN(birth.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDelta = today.getMonth() - birth.getMonth()
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age--

  // 130 keeps a mistyped or corrupted year (1064, 2964) from becoming an age.
  if (age < 0 || age > 130) return null
  return age
}

/**
 * The patient's age, whatever the payload calls it, falling back to the date
 * of birth. Returns null when neither is usable — which the caller must treat
 * as "unknown", never as zero: a missing age silently read as 0 turns every
 * adult into an infant for dosing, differentials and guideline retrieval.
 */
export function resolvePatientAge(patient: Record<string, any> | null | undefined): number | null {
  if (!patient || typeof patient !== 'object') return null

  for (const key of AGE_KEYS) {
    const raw = patient[key]
    if (raw === null || raw === undefined || raw === '') continue
    const parsed = typeof raw === 'number' ? raw : parseInt(String(raw).trim(), 10)
    if (Number.isFinite(parsed) && parsed > 0 && parsed <= 130) return parsed
  }

  for (const key of BIRTH_DATE_KEYS) {
    const derived = ageFromBirthDate(patient[key])
    if (derived !== null && derived > 0) return derived
  }

  return null
}

/** Split a free-text medication list on the separators patients and nurses use. */
function splitMedicationText(text: string): string[] {
  return text
    .split(/[\n;,]+/)
    .map(entry => entry.trim())
    .filter(entry => entry.length > 0 && !NOTHING_TO_DECLARE.has(entry.toLowerCase()))
}

/**
 * The patient's current medications as a list.
 *
 * Prefers a real array, and falls back to the free-text field the TIBOK
 * handoff sends — which used to be logged and then dropped, leaving the
 * prescribing model blind to what the patient already takes.
 */
export function resolveCurrentMedications(patient: Record<string, any> | null | undefined): string[] {
  if (!patient || typeof patient !== 'object') return []

  for (const key of MEDICATION_ARRAY_KEYS) {
    const raw = patient[key]
    if (!Array.isArray(raw) || raw.length === 0) continue
    const entries = raw
      .map(entry => (typeof entry === 'string' ? entry.trim() : entry))
      .filter(entry => {
        if (typeof entry !== 'string') return !!entry // structured medication objects pass through
        return entry.length > 0 && !NOTHING_TO_DECLARE.has(entry.toLowerCase())
      })
    if (entries.length > 0) return entries as string[]
  }

  for (const key of MEDICATION_TEXT_KEYS) {
    const raw = patient[key]
    if (typeof raw !== 'string' || !raw.trim()) continue
    const entries = splitMedicationText(raw)
    if (entries.length > 0) return entries
  }

  return []
}

/**
 * A copy of the patient record with `age` and `currentMedications` filled in
 * from whichever spelling carried them. Everything else is untouched, and a
 * field that already holds a usable value is never overwritten.
 *
 * Use at the boundary where an external payload enters the app (the TIBOK
 * handoff), so the forms, the documents and the model all read the same
 * patient.
 */
export function normalisePatientRecord<T extends Record<string, any>>(patient: T): T {
  if (!patient || typeof patient !== 'object') return patient

  const normalised: Record<string, any> = { ...patient }

  // Written as a string because that is what the patient form's field holds;
  // every other reader either parses it or interpolates it.
  const age = resolvePatientAge(patient)
  if (age !== null) normalised.age = String(age)

  const medications = resolveCurrentMedications(patient)
  if (medications.length > 0) {
    normalised.currentMedications = medications
    normalised.current_medications = medications
  }

  return normalised as T
}
