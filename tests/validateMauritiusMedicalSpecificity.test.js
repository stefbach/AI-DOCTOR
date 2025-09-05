import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

// Extract the dosage regex from the source file to ensure tests reflect implementation.
const routePath = path.join(process.cwd(), 'app', 'api', 'openai-diagnosis', 'route.ts');
const source = fs.readFileSync(routePath, 'utf8');
const matches = [...source.matchAll(/drugName\.match\((\/.*?\/[a-z]*)\)/g)];
if (matches.length === 0) {
  throw new Error('Dosage regex not found in route.ts');
}
const dosageRegex = eval(matches[matches.length - 1][1]);

test('1g is accepted by generic-name validation', () => {
  assert.ok(dosageRegex.test('1g'));
});

test('500 mg is accepted by generic-name validation', () => {
  assert.ok(dosageRegex.test('500 mg'));
});
