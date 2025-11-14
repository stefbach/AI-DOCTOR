/**
 * Shared UI Components for Follow-Up Workflows
 * 
 * This module exports reusable React components that are used across
 * all follow-up consultation types (normal, dermatology, chronic).
 * 
 * Components provide consistent UX for:
 * - Patient search and identification
 * - Consultation history display
 * - Vital signs comparison
 * - Detailed consultation viewing
 */

export { PatientSearch } from './patient-search'
export type { PatientSearchProps, PatientSearchCriteria } from './patient-search'

export { HistoryList } from './history-list'
export type { HistoryListProps } from './history-list'

export { ComparisonCard } from './comparison-card'
export type { ComparisonCardProps } from './comparison-card'

export { ConsultationDetailModal } from './consultation-detail-modal'
export type { ConsultationDetailModalProps } from './consultation-detail-modal'
