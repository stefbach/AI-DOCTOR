import assert from 'node:assert/strict'
import { validateTherapeuticCompleteness } from '../app/api/openai-diagnosis/route'

const patientContext = {
  age: 30,
  sex: 'male',
  medical_history: [],
  current_medications: [],
  allergies: [],
  chief_complaint: '',
  symptoms: [],
  symptom_duration: '',
  disease_history: '',
  ai_questions: []
}

const analysis = {
  treatment_plan: {
    medications: [
      {
        drug: 'SampleDrug',
        dci: 'sample',
        dosing: { adult: '100mg' },
        duration: { start: 'today', end: 'tomorrow' }
      }
    ]
  },
  clinical_analysis: { primary_diagnosis: { condition: 'condition' } }
}

let warned = false
const originalWarn = console.warn
console.warn = () => { warned = true }

const result = validateTherapeuticCompleteness(analysis, patientContext)

console.warn = originalWarn

assert.equal(warned, true)
assert.equal(result.issues.length, 0)
