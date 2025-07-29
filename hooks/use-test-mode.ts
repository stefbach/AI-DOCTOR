// hooks/use-test-mode.ts

import { useState, useEffect } from 'react'
import { TestPatient } from '@/lib/test-patients-data'

interface UseTestModeReturn {
  isTestMode: boolean
  currentTestPatient: TestPatient | null
  setTestPatient: (patient: TestPatient | null) => void
  clearTestMode: () => void
  getTestDataForStep: (step: number) => any
}

export function useTestMode(): UseTestModeReturn {
  const [isTestMode, setIsTestMode] = useState(false)
  const [currentTestPatient, setCurrentTestPatient] = useState<TestPatient | null>(null)

  // Charger le patient test depuis le localStorage au montage
  useEffect(() => {
    const savedTestPatient = localStorage.getItem('test-patient')
    if (savedTestPatient) {
      try {
        const patient = JSON.parse(savedTestPatient)
        setCurrentTestPatient(patient)
        setIsTestMode(true)
      } catch (error) {
        console.error('Erreur lors du chargement du patient test:', error)
      }
    }
  }, [])

  const setTestPatient = (patient: TestPatient | null) => {
    if (patient) {
      setCurrentTestPatient(patient)
      setIsTestMode(true)
      localStorage.setItem('test-patient', JSON.stringify(patient))
    } else {
      clearTestMode()
    }
  }

  const clearTestMode = () => {
    setCurrentTestPatient(null)
    setIsTestMode(false)
    localStorage.removeItem('test-patient')
  }

  const getTestDataForStep = (step: number) => {
    if (!currentTestPatient) return null

    switch (step) {
      case 0: // Patient Form
        return currentTestPatient.patientData
      
      case 1: // Clinical Form
        return currentTestPatient.clinicalData
      
      case 2: // Questions Form
        // Les questions seront générées par l'IA en fonction des données cliniques
        return {
          patientData: currentTestPatient.patientData,
          clinicalData: currentTestPatient.clinicalData
        }
      
      case 3: // Diagnosis Form
        // Le diagnostic sera généré par l'IA
        return {
          patientData: currentTestPatient.patientData,
          clinicalData: currentTestPatient.clinicalData,
          expectedConditions: currentTestPatient.expectedConditions
        }
      
      case 4: // Medical Workflow
        // Documents générés en fonction de toutes les données
        return {
          patientData: currentTestPatient.patientData,
          clinicalData: currentTestPatient.clinicalData,
          expectedConditions: currentTestPatient.expectedConditions
        }
      
      default:
        return null
    }
  }

  return {
    isTestMode,
    currentTestPatient,
    setTestPatient,
    clearTestMode,
    getTestDataForStep
  }
}
