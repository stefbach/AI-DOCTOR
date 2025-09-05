import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateMedicationSafety } from '../app/api/openai-diagnosis/route';

test('validateMedicationSafety handles non-string current_medications entries', () => {
  const newMeds = [{ drug: 'Aspirin' }];
  const currentMeds: any[] = ['Warfarin', 123, { name: 'Ibuprofen' }];

  assert.doesNotThrow(() => {
    const result = validateMedicationSafety(newMeds, currentMeds, 'consultation');
    assert.ok(Array.isArray(result.interactions));
  });
});
