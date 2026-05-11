// lib/anonymize-patient.ts
// Shared patient anonymisation helper. Strips identifying fields from a
// patient payload before it is sent to an external LLM (in practice this
// matters for DeepSeek calls; for OpenAI we keep the same behaviour for
// uniformity and for HIPAA Safe Harbor §164.514 alignment).
//
// The anonymised payload keeps all clinically relevant fields (age, sex,
// weight, height, allergies, history, medications, lifestyle, vitals, ...).
// Only direct identifiers are removed.

const IDENTIFYING_FIELDS = [
  'nom',
  'nomComplet',
  'firstName',
  'lastName',
  'name',
  'prenom',
  'fullName',
  'patientName',
  'telephone',
  'phone',
  'phoneNumber',
  'email',
  'address',
  'adresse',
  'addressLine',
  'street',
  'postalCode',
  'zipCode',
  'nationalId',
  'national_id',
  'idNumber',
  'id_number',
  'nic',
  'ssn',
] as const

export interface AnonymizeResult<T> {
  anonymized: T
  anonymousId: string
  removedFields: string[]
}

function makeAnonymousId(prefix = 'ANON'): string {
  const ts = Date.now()
  const rand = Math.random().toString(36).substring(2, 11)
  return `${prefix}-${ts}-${rand}`
}

/**
 * Returns a shallow-cloned copy of `patient` with direct identifiers removed,
 * plus the anonymous id that should be used to correlate the request in logs.
 * Non-object inputs are returned unchanged.
 */
export function anonymizePatient<T extends Record<string, any> | undefined | null>(
  patient: T,
  prefix = 'ANON',
): AnonymizeResult<T> {
  const anonymousId = makeAnonymousId(prefix)

  if (!patient || typeof patient !== 'object') {
    return { anonymized: patient, anonymousId, removedFields: [] }
  }

  const anonymized: any = { ...patient }
  const removedFields: string[] = []
  for (const field of IDENTIFYING_FIELDS) {
    if (field in anonymized) {
      delete anonymized[field]
      removedFields.push(field)
    }
  }
  anonymized.anonymousId = anonymousId

  return { anonymized: anonymized as T, anonymousId, removedFields }
}
