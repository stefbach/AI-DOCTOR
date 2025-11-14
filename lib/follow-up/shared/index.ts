/**
 * Shared Follow-Up Module
 * 
 * HYBRID ARCHITECTURE - SHARED FOUNDATIONS
 * 
 * This module provides reusable functionality for all follow-up consultation workflows:
 * - Normal consultations
 * - Dermatology consultations  
 * - Chronic disease consultations
 * 
 * Architecture Benefits:
 * - 70% code reuse across workflows
 * - Consistent UX patterns
 * - Centralized business logic
 * - Type-safe data structures
 * 
 * @module lib/follow-up/shared
 */

// ========================================
// COMPONENTS - UI Layer
// ========================================
export {
  PatientSearch,
  HistoryList,
  ComparisonCard,
  ConsultationDetailModal
} from './components'

export type {
  PatientSearchProps,
  PatientSearchCriteria,
  HistoryListProps,
  ComparisonCardProps,
  ConsultationDetailModalProps
} from './components'

// ========================================
// HOOKS - State Management
// ========================================
export {
  usePatientHistory
} from './hooks/use-patient-history'

export type {
  UsePatientHistoryReturn
} from './hooks/use-patient-history'

// ========================================
// UTILITIES - Business Logic
// ========================================
export {
  fetchPatientHistory,
  fetchMostRecentConsultation,
  extractPatientDemographics
} from './utils/history-fetcher'

export type {
  ConsultationHistoryItem,
  PatientDemographics
} from './utils/history-fetcher'

export {
  compareVitalSigns,
  compareBloodPressure,
  compareWeight,
  compareBMI,
  compareGlucose,
  calculateChange,
  calculatePercentageChange
} from './utils/data-comparator'

export type {
  VitalSignsComparison,
  MetricComparison
} from './utils/data-comparator'
