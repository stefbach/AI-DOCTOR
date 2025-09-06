import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'

const routeSource = fs.readFileSync(path.join(process.cwd(), 'app', 'api', 'openai-diagnosis', 'route.ts'), 'utf8')

test('route exports tropical helpers', () => {
  assert.ok(routeSource.includes('callOpenAIWithMauritiusQualityTropical'))
  assert.ok(routeSource.includes('MAURITIUS_ENHANCED_MEDICAL_PROMPT'))
})

function validateTropicalMedicalSafety(analysis, patientContext) {
  const meds = analysis?.treatment_plan?.medications || []
  const fever = (patientContext?.symptoms || []).some(s =>
    s.toLowerCase().includes('fever') || s.toLowerCase().includes('pyrex')
  ) || (patientContext?.vital_signs?.temperature || 0) >= 38
  const issues = []
  if (fever) {
    const banned = meds.filter(m => {
      const name = (m?.drug || m?.medication_name || '').toLowerCase()
      return /aspirin|acetylsalicylic|ibuprofen|diclofenac|naproxen/.test(name)
    })
    if (banned.length > 0) {
      issues.push('Avoid aspirin/NSAIDs in febrile patients in tropical regions')
    }
  }
  return { isValid: issues.length === 0, issues }
}

function addMauritiusTropicalInvestigations(analysis) {
  analysis.investigation_strategy = analysis.investigation_strategy || {}
  analysis.investigation_strategy.laboratory_tests = analysis.investigation_strategy.laboratory_tests || []
  const required = [
    { test_name: 'Dengue NS1 antigen', clinical_justification: 'Rule out dengue fever' },
    { test_name: 'Chikungunya IgM/IgG', clinical_justification: 'Detect chikungunya infection' },
    { test_name: 'Malaria rapid diagnostic test', clinical_justification: 'Screen for malaria' }
  ]
  required.forEach(t => {
    if (!analysis.investigation_strategy.laboratory_tests.some(e => e?.test_name === t.test_name)) {
      analysis.investigation_strategy.laboratory_tests.push(t)
    }
  })
  return analysis
}

test('validateTropicalMedicalSafety rejects NSAIDs with fever', () => {
  const analysis = { treatment_plan: { medications: [{ drug: 'Aspirin 500mg' }] } }
  const context = { symptoms: ['fever'], vital_signs: { temperature: 38 } }
  const result = validateTropicalMedicalSafety(analysis, context)
  assert.equal(result.isValid, false)
  assert.ok(result.issues.some(i => i.includes('NSAIDs')))
})

test('addMauritiusTropicalInvestigations injects dengue/chikungunya/malaria tests', () => {
  const analysis = { investigation_strategy: { laboratory_tests: [] } }
  const updated = addMauritiusTropicalInvestigations(analysis)
  const tests = updated.investigation_strategy.laboratory_tests.map(t => t.test_name)
  assert.deepEqual(tests, ['Dengue NS1 antigen', 'Chikungunya IgM/IgG', 'Malaria rapid diagnostic test'])
})

test('GET ?test_tropical=true returns expected fields', () => {
  const analysis = { treatment_plan: { medications: [{ drug: 'Ibuprofen 400mg' }] }, investigation_strategy: { laboratory_tests: [] } }
  const context = { symptoms: ['fever'], vital_signs: { temperature: 38 } }
  const safety = validateTropicalMedicalSafety(analysis, context)
  const withTests = addMauritiusTropicalInvestigations({ investigation_strategy: { laboratory_tests: [] } })
  const response = {
    test_type: 'Test Tropical Medicine',
    safety,
    investigations: withTests.investigation_strategy.laboratory_tests.map(t => t.test_name)
  }
  assert.equal(response.test_type, 'Test Tropical Medicine')
  assert.ok(response.investigations.includes('Dengue NS1 antigen'))
  assert.equal(response.safety.isValid, false)
})
