import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  ageFromBirthDate,
  mergePatientRecords,
  normalisePatientRecord,
  parseTibokPatientParam,
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

describe('mergePatientRecords', () => {
  it('completes the nurse draft with TIBOK identity — the 02/09 case', () => {
    // What the nurse draft actually held: six fields, no identity.
    const draft = {
      allergies: ['Non'],
      currentMedicationsText: 'Aucun',
      gender: 'F',
      height: '165',
      weight: '65',
      lifeHabits: { smoking: 'no' },
    }
    const tibok = {
      firstName: 'Megane Claudia',
      lastName: 'Quenette',
      dateOfBirth: '1993-03-17',
      age: 33,
      gender: 'F',
      height: 165,
      weight: 60,
    }

    const merged = mergePatientRecords(tibok, draft)

    assert.strictEqual(merged.firstName, 'Megane Claudia')
    assert.strictEqual(merged.lastName, 'Quenette')
    assert.strictEqual(merged.dateOfBirth, '1993-03-17')
    // What the nurse recorded wins: she weighed the patient today.
    assert.strictEqual(merged.weight, '65')
    assert.deepStrictEqual(merged.allergies, ['Non'])
  })

  it('never lets a blank overlay value erase a real one', () => {
    const merged = mergePatientRecords(
      { firstName: 'Megane', allergies: ['Pénicilline'], weight: 65 },
      { firstName: '', allergies: [], weight: null },
    )
    assert.strictEqual(merged.firstName, 'Megane')
    assert.deepStrictEqual(merged.allergies, ['Pénicilline'])
    assert.strictEqual(merged.weight, 65)
  })

  it('copes with either side missing', () => {
    assert.deepStrictEqual(mergePatientRecords(null, { a: 1 }), { a: 1 })
    assert.deepStrictEqual(mergePatientRecords({ a: 1 }, null), { a: 1 })
    assert.deepStrictEqual(mergePatientRecords(null, null), {})
  })
})

describe('parseTibokPatientParam', () => {
  it('parses a doubly-encoded record, as TIBOK sends it', () => {
    const record = { firstName: 'Megane Claudia', age: 33 }
    const doubly = encodeURIComponent(encodeURIComponent(JSON.stringify(record)))
    assert.deepStrictEqual(parseTibokPatientParam(doubly), record)
  })

  it('parses plain JSON', () => {
    assert.deepStrictEqual(parseTibokPatientParam('{"age":33}'), { age: 33 })
  })

  it('trims the extra URL TIBOK sometimes appends', () => {
    const raw = encodeURIComponent('{"age":33}https://tibok.mu/whatever')
    assert.deepStrictEqual(parseTibokPatientParam(raw), { age: 33 })
  })

  it('returns null on anything unusable', () => {
    assert.strictEqual(parseTibokPatientParam(''), null)
    assert.strictEqual(parseTibokPatientParam(null), null)
    assert.strictEqual(parseTibokPatientParam('not json'), null)
  })
})
