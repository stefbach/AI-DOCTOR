/**
 * TIBOK patient data normalizer.
 *
 * Why this exists:
 *   TIBOK delivers patient data through several paths with inconsistent
 *   field casing:
 *     - URL param `medicalData`: snake_case (first_name, phone_number, ...)
 *     - URL param `patientData`: camelCase (firstName, phone, ...)
 *     - Hooks/components: a mix of both
 *   Downstream consumers (forms, APIs, report generators) each read a
 *   different subset of these names. When TIBOK sends `phone_number` but
 *   a consumer reads `phone`, the value is silently dropped — leading to
 *   "Not provided" propagating all the way to /api/save-medical-report
 *   and a hard 400 "Phone number required".
 *
 * What this does:
 *   For every known patient field, populate ALL known variants from
 *   whichever variant the input provided. Downstream code reading any
 *   variant gets the value.
 *
 * Guarantees:
 *   - Never mutates the input (returns a new object).
 *   - Empty strings, null and undefined are treated as "not set" — first
 *     non-empty variant wins.
 *   - Unknown fields are passed through unchanged.
 *   - Idempotent: normalizing already-normalized data is a no-op.
 */

type AnyRecord = Record<string, any>

/**
 * Canonical field name -> all variants TIBOK / downstream code may use.
 * The first variant in each list is the canonical name (also used for
 * components that read the canonical name).
 */
const FIELD_VARIANTS: Record<string, string[]> = {
  // Identity
  firstName:   ['firstName', 'first_name', 'prenom'],
  lastName:    ['lastName', 'last_name', 'nom'],
  fullName:    ['fullName', 'full_name', 'nomComplet', 'name'],

  // Demographics
  dateOfBirth: ['dateOfBirth', 'date_of_birth', 'dateNaissance', 'birthDate'],
  age:         ['age'],
  gender:      ['gender', 'sex', 'sexe'],

  // Contact
  phone:       ['phone', 'phone_number', 'phoneNumber', 'telephone'],
  email:       ['email'],
  address:     ['address', 'adresse'],
  city:        ['city', 'ville'],
  country:     ['country', 'pays'],

  // Body metrics
  weight:      ['weight', 'poids'],
  height:      ['height', 'taille'],

  // IDs (common between TIBOK and AI-DOCTOR)
  id:          ['id', 'patient_id', 'patientId'],
}

function isNonEmpty(v: any): boolean {
  return v !== undefined && v !== null && v !== ''
}

/**
 * Normalize a TIBOK patient data object so every known field is available
 * under every variant naming convention.
 *
 * Example: input { phone_number: '+230...' } produces output with
 * { phone: '+230...', phone_number: '+230...', phoneNumber: '+230...',
 *   telephone: '+230...' } — plus all other untouched fields.
 */
export function normalizeTibokPatientData<T extends AnyRecord | null | undefined>(
  raw: T
): T {
  if (!raw || typeof raw !== 'object') return raw

  const out: AnyRecord = { ...raw }

  for (const variants of Object.values(FIELD_VARIANTS)) {
    // Find the first non-empty variant in the input
    let value: any
    for (const v of variants) {
      if (isNonEmpty(out[v])) {
        value = out[v]
        break
      }
    }
    if (!isNonEmpty(value)) continue

    // Populate every variant that is currently empty — never overwrite
    // an existing non-empty value (caller may have set a more accurate one)
    for (const v of variants) {
      if (!isNonEmpty(out[v])) {
        out[v] = value
      }
    }
  }

  return out as T
}
