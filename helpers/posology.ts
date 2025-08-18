import { MEDICATION_POSOLOGY_DATABASE } from '@/lib/posology-db'

export function loadPosologyDatabase() {
  return MEDICATION_POSOLOGY_DATABASE
}

export function findMedicationPosology(name: string) {
  const db = loadPosologyDatabase()
  return db[name.toLowerCase()] || null
}
