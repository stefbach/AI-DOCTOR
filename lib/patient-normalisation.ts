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

/**
 * The patient's date of birth, whatever the payload calls it.
 *
 * TIBOK sends `dateOfBirth`; the patient form writes `birthDate` (and four
 * other spellings); the report read only `birthDate` and printed "Not
 * provided" on every consultation that came straight from TIBOK.
 */
export function resolveBirthDate(patient: Record<string, any> | null | undefined): string | null {
  if (!patient || typeof patient !== 'object') return null

  for (const key of BIRTH_DATE_KEYS) {
    const raw = patient[key]
    if (typeof raw === 'string' && raw.trim()) return raw.trim()
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

  // Both spellings, so a reader that knows only one of them still finds it.
  const birthDate = resolveBirthDate(patient)
  if (birthDate) {
    normalised.birthDate = birthDate
    normalised.dateOfBirth = birthDate
  }

  const medications = resolveCurrentMedications(patient)
  if (medications.length > 0) {
    normalised.currentMedications = medications
    normalised.current_medications = medications
  }

  return normalised as T
}

/**
 * Parse the patient record TIBOK puts in the `patientData` (or `medicalData`)
 * URL parameter.
 *
 * The value can arrive singly or multiply URL-encoded, and TIBOK sometimes
 * appends another URL after the closing brace, so this decodes up to five
 * times and trims anything past the JSON. Returns null when nothing usable
 * comes out — callers must treat that as "no record", never as an error.
 */
export function parseTibokPatientParam(raw: string | null | undefined): any | null {
  if (!raw) return null

  let decoded = String(raw)

  if (decoded.startsWith('{')) {
    try {
      return JSON.parse(decoded)
    } catch {
      // Not valid JSON yet — fall through to the decode loop.
    }
  }

  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      decoded = decodeURIComponent(decoded)
      if (!decoded.startsWith('{')) continue

      // TIBOK sometimes appends an extra URL after the JSON.
      const lastBrace = decoded.lastIndexOf('}')
      const jsonString =
        lastBrace !== -1 && lastBrace < decoded.length - 1
          ? decoded.substring(0, lastBrace + 1)
          : decoded

      return JSON.parse(jsonString)
    } catch {
      // Keep decoding; a failure on the last attempt means we give up.
    }
  }

  return null
}

/** A value that carries no information and must never overwrite one that does. */
function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  return false
}

/**
 * Lay one patient record over another, keeping every field the overlay
 * actually fills in and falling back to the base for the rest.
 *
 * This exists because the nurse draft is a partial record — on 02/09 it held
 * six fields (allergies, medications text, gender, height, weight, lifestyle)
 * and no identity at all, so the doctor's report refused to generate for want
 * of a name, and the patient had no age. The overlay is what the nurse
 * actually recorded and wins wherever she filled something in; the base is
 * TIBOK's own patient record, which carries the identity.
 */
export function mergePatientRecords(
  base: Record<string, any> | null | undefined,
  overlay: Record<string, any> | null | undefined,
): Record<string, any> {
  if (!base || typeof base !== 'object') return { ...(overlay || {}) }
  if (!overlay || typeof overlay !== 'object') return { ...base }

  const merged: Record<string, any> = { ...base }
  for (const [key, value] of Object.entries(overlay)) {
    if (!isBlank(value)) merged[key] = value
  }
  return merged
}
