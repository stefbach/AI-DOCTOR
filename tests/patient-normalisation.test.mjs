import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  ageFromBirthDate,
  normalisePatientRecord,
  resolveCurrentMedications,
  resolvePatientAge,
} from '../lib/patient-normalisation.ts'

describe('resolvePatientAge', () => {
  it('reads a numeric age', () => {
    assert.strictEqual(resolvePatientAge({ age: 62 }), 62)
  })

  it('reads an age stored as a string', () => {
    assert.strictEqual(resolvePatientAge({ age: '62' }), 62)
  })

  it('falls back to the date of birth — the 01/09 case', () => {
    // The handoff payload carried dateOfBirth and no usable age, and the
    // patient reached the model as 0 years old.
    const age = resolvePatientAge({ dateOfBirth: '1964-07-20' })
    assert.ok(age !== null && age >= 61 && age <= 63, `expected ~62, got ${age}`)
  })

  it('accepts the other spellings of the birth date', () => {
    assert.ok(resolvePatientAge({ birthDate: '1990-01-01' }) > 30)
    assert.ok(resolvePatientAge({ date_of_birth: '1990-01-01' }) > 30)
    assert.ok(resolvePatientAge({ dateNaissance: '1990-01-01' }) > 30)
  })

  it('returns null rather than 0 when nothing is usable', () => {
    assert.strictEqual(resolvePatientAge({}), null)
    assert.strictEqual(resolvePatientAge({ age: '' }), null)
    assert.strictEqual(resolvePatientAge({ dateOfBirth: 'not a date' }), null)
    assert.strictEqual(resolvePatientAge(null), null)
  })

  it('rejects an implausible age', () => {
    assert.strictEqual(resolvePatientAge({ age: 964 }), null)
    assert.strictEqual(ageFromBirthDate('1064-01-01'), null)
  })
})

describe('resolveCurrentMedications', () => {
  it('parses the comma-separated text the handoff sends', () => {
    const meds = resolveCurrentMedications({
      currentMedicationsText: 'Colopido-grêle 75, Amlodipine 10, Atorvastatine 20',
    })
    assert.deepStrictEqual(meds, ['Colopido-grêle 75', 'Amlodipine 10', 'Atorvastatine 20'])
  })

  it('parses one medicine per line', () => {
    const meds = resolveCurrentMedications({ currentMedicationsText: 'Amlodipine 10\nAtorvastatine 20' })
    assert.deepStrictEqual(meds, ['Amlodipine 10', 'Atorvastatine 20'])
  })

  it('prefers a real array over the text', () => {
    const meds = resolveCurrentMedications({
      currentMedications: ['Amlodipine 10'],
      currentMedicationsText: 'ignored',
    })
    assert.deepStrictEqual(meds, ['Amlodipine 10'])
  })

  it('reads currentMedications when it arrives as a string', () => {
    assert.deepStrictEqual(resolveCurrentMedications({ currentMedications: 'Amlodipine 10' }), ['Amlodipine 10'])
  })

  it('treats the "nothing to declare" placeholders as empty', () => {
    assert.deepStrictEqual(resolveCurrentMedications({ currentMedicationsText: 'None' }), [])
    assert.deepStrictEqual(resolveCurrentMedications({ currentMedicationsText: 'Aucun' }), [])
    assert.deepStrictEqual(resolveCurrentMedications({ currentMedications: [] }), [])
    assert.deepStrictEqual(resolveCurrentMedications({}), [])
  })
})

describe('normalisePatientRecord', () => {
  it('fills age and medications without touching anything else', () => {
    const raw = {
      firstName: 'Stephane Henri',
      dateOfBirth: '1964-07-20',
      currentMedicationsText: 'Amlodipine 10, Atorvastatine 20',
      consultationReason: 'très mal au ventre',
    }
    const out = normalisePatientRecord(raw)

    // Computed from the birth date, so assert the shape rather than a value
    // that ages with the calendar.
    assert.strictEqual(typeof out.age, 'string')
    assert.ok(Number(out.age) >= 61, `expected an adult age, got ${out.age}`)
    assert.deepStrictEqual(out.currentMedications, ['Amlodipine 10', 'Atorvastatine 20'])
    assert.deepStrictEqual(out.current_medications, ['Amlodipine 10', 'Atorvastatine 20'])
    assert.strictEqual(out.firstName, 'Stephane Henri')
    assert.strictEqual(out.consultationReason, 'très mal au ventre')
    // The input is left alone.
    assert.strictEqual(raw.age, undefined)
  })

  it('leaves a record it cannot improve unchanged', () => {
    const out = normalisePatientRecord({ firstName: 'Test' })
    assert.deepStrictEqual(out, { firstName: 'Test' })
  })
})
