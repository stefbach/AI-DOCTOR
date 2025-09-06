import { analyzeConsultationType } from '../lib/consultation-utils'
import { describe, it } from 'node:test'
import assert from 'node:assert'

describe('analyzeConsultationType', () => {
  it('handles missing chiefComplaint', () => {
    const result = analyzeConsultationType([], undefined as any, [])
    assert.strictEqual(result.consultationType, 'new_problem')
  })
})
