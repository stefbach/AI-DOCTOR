import { test } from 'node:test'
import assert from 'node:assert/strict'
import { validateMauritiusMedicalSpecificity } from '../app/api/openai-diagnosis/route'

test('handles non-stringifiable med.drug gracefully', () => {
  const problematicDrug = {
    toString() {
      throw new Error('cannot stringify')
    }
  }

  const analysis = {
    treatment_plan: {
      medications: [
        {
          drug: problematicDrug,
          dci: 'Amoxicilline',
          indication: 'Treatment of infection',
          dosing: {
            adult: '500mg BD',
            daily_total_dose: '1000mg',
            frequency_per_day: 2
          }
        }
      ]
    }
  }

  let result: any
  assert.doesNotThrow(() => {
    result = validateMauritiusMedicalSpecificity(analysis)
  })
  assert.equal(result.issues.length, 0)
})
