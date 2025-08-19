import { describe, it, expect } from 'vitest'
import { detectUrgencyMode } from '../components/questions-form'

describe('detectUrgencyMode', () => {
  const urgentKeywords = [
    'severe chest pain',
    'palpitations',
    'sudden weakness',
    'speech difficulty',
    'severe bleeding'
  ]

  urgentKeywords.forEach(keyword => {
    it(`returns fast when clinical data includes "${keyword}"`, () => {
      const clinicalData = { symptoms: keyword, chiefComplaint: '' }
      expect(detectUrgencyMode(clinicalData)).toBe('fast')
    })
  })
})
