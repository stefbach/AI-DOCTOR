import { describe, it } from 'node:test'
import assert from 'node:assert'
// Imported with the explicit .ts extension so `node --test` can strip the
// types itself — this file is .mjs so the repo's tsc pass ignores it.
import { normaliseJsonFraming, parseJsonLossless, stripTrailingCommas } from '../lib/llm/json-recovery.ts'

describe('stripTrailingCommas', () => {
  it('drops a comma before a closing brace', () => {
    assert.strictEqual(stripTrailingCommas('{"a":1,}'), '{"a":1}')
  })

  it('drops a comma before a closing bracket, across newlines', () => {
    assert.strictEqual(stripTrailingCommas('{"a":[1,2,\n  ]}'), '{"a":[1,2\n  ]}')
  })

  it('leaves commas inside string literals alone', () => {
    const raw = '{"note":"Paracetamol, then review,"}'
    assert.strictEqual(stripTrailingCommas(raw), raw)
  })

  it('leaves a well-formed document untouched', () => {
    const raw = '{"a":1,"b":[2,3]}'
    assert.strictEqual(stripTrailingCommas(raw), raw)
  })
})

describe('parseJsonLossless', () => {
  it('parses clean JSON with no repair', () => {
    const result = parseJsonLossless('{"condition":"Non-specific abdominal pain"}')
    assert.strictEqual(result.ok, true)
    if (result.ok) {
      assert.strictEqual(result.repair, 'none')
      assert.strictEqual(result.value.condition, 'Non-specific abdominal pain')
    }
  })

  it('recovers the trailing-comma failure seen on 01/09', () => {
    // "Expected double-quoted property name" — the error that cost a
    // consultation a full 46s generation.
    const result = parseJsonLossless('{"treatment_plan":{"medications":[{"drug":"Omeprazole 20mg"},],},}')
    assert.strictEqual(result.ok, true)
    if (result.ok) {
      assert.strictEqual(result.repair, 'trailing-commas')
      assert.strictEqual(result.value.treatment_plan.medications[0].drug, 'Omeprazole 20mg')
    }
  })

  it('recovers unescaped control characters inside a string', () => {
    const result = parseJsonLossless('{"reasoning":"line one\nline two"}')
    assert.strictEqual(result.ok, true)
    if (result.ok) assert.strictEqual(result.repair, 'control-chars')
  })

  it('refuses truncated JSON rather than amputating the analysis', () => {
    const truncated = '{"clinical_analysis":{"primary_diagnosis":{"condition":"Acute chole'
    const result = parseJsonLossless(truncated)
    assert.strictEqual(result.ok, false)
  })

  it('refuses an empty response', () => {
    assert.strictEqual(parseJsonLossless('   \n  ').ok, false)
    assert.strictEqual(parseJsonLossless('').ok, false)
  })
})

describe('normaliseJsonFraming', () => {
  it('unwraps a fenced json block', () => {
    assert.strictEqual(normaliseJsonFraming('```json\n{"a":1}\n```'), '{"a":1}')
  })

  it('drops a reasoning preamble and a closing sentence', () => {
    const raw = 'Let me think about this case.\n{"a":1}\nI hope this helps.'
    assert.strictEqual(normaliseJsonFraming(raw), '{"a":1}')
  })

  it('leaves a bare object untouched', () => {
    assert.strictEqual(normaliseJsonFraming('{"a":1}'), '{"a":1}')
  })

  it('returns the trimmed input when there is no object at all', () => {
    assert.strictEqual(normaliseJsonFraming('  no json here  '), 'no json here')
  })
})
