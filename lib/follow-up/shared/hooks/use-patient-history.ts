// lib/follow-up/shared/hooks/use-patient-history.ts
"use client"

import { useState, useEffect, useCallback } from 'react'
import { 
  fetchPatientHistory, 
  fetchMostRecentConsultation,
  extractPatientDemographics,
  ConsultationHistoryItem,
  PatientSearchCriteria
} from '../utils/history-fetcher'

export interface UsePatientHistoryReturn {
  history: ConsultationHistoryItem[]
  mostRecent: ConsultationHistoryItem | null
  patientDemographics: any
  loading: boolean
  error: string | null
  searchPatient: (criteria: PatientSearchCriteria) => Promise<void>
  selectConsultation: (consultationId: string) => ConsultationHistoryItem | null
  clearHistory: () => void
}

/**
 * Custom hook for managing patient consultation history
 * Provides easy access to patient's previous consultations with loading states
 * 
 * @example
 * const { history, loading, searchPatient } = usePatientHistory()
 * 
 * // Search by name
 * await searchPatient({ name: 'John Doe' })
 * 
 * // Search by email
 * await searchPatient({ email: 'patient@example.com' })
 */
export function usePatientHistory(): UsePatientHistoryReturn {
  const [history, setHistory] = useState<ConsultationHistoryItem[]>([])
  const [mostRecent, setMostRecent] = useState<ConsultationHistoryItem | null>(null)
  const [patientDemographics, setPatientDemographics] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  /**
   * Search for patient consultations
   */
  const searchPatient = useCallback(async (criteria: PatientSearchCriteria) => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Searching patient with criteria:', criteria)
      
      // Fetch full history
      const consultationHistory = await fetchPatientHistory(criteria)
      setHistory(consultationHistory)
      
      // Set most recent
      const recent = consultationHistory.length > 0 ? consultationHistory[0] : null
      setMostRecent(recent)
      
      // Extract demographics
      if (recent) {
        const demographics = await extractPatientDemographics(criteria)
        setPatientDemographics(demographics)
        console.log('✅ Patient found with', consultationHistory.length, 'consultations')
      } else {
        setPatientDemographics(null)
        console.log('⚠️ No consultations found for patient')
      }
      
    } catch (err: any) {
      console.error('❌ Error searching patient:', err)
      setError(err.message || 'Failed to search patient history')
      setHistory([])
      setMostRecent(null)
      setPatientDemographics(null)
    } finally {
      setLoading(false)
    }
  }, [])
  
  /**
   * Select a specific consultation from history
   */
  const selectConsultation = useCallback((consultationId: string): ConsultationHistoryItem | null => {
    const consultation = history.find(item => item.consultationId === consultationId)
    return consultation || null
  }, [history])
  
  /**
   * Clear all history data
   */
  const clearHistory = useCallback(() => {
    setHistory([])
    setMostRecent(null)
    setPatientDemographics(null)
    setError(null)
  }, [])
  
  return {
    history,
    mostRecent,
    patientDemographics,
    loading,
    error,
    searchPatient,
    selectConsultation,
    clearHistory
  }
}

/**
 * Hook for comparing consultations
 * Useful for follow-up workflows that need to compare current vs previous data
 */
export function useConsultationComparison(
  previousConsultation: ConsultationHistoryItem | null
) {
  const [comparisonData, setComparisonData] = useState<any>(null)
  
  useEffect(() => {
    if (previousConsultation) {
      // Prepare comparison data structure
      setComparisonData({
        previousVitals: previousConsultation.vitalSigns,
        previousMedications: previousConsultation.medications,
        previousDiagnosis: previousConsultation.diagnosis,
        previousLabTests: previousConsultation.labTests,
        consultationDate: previousConsultation.date
      })
    } else {
      setComparisonData(null)
    }
  }, [previousConsultation])
  
  return comparisonData
}
