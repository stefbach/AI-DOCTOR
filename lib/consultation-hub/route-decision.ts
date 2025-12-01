import type { ConsultationHistoryItem } from '@/lib/follow-up/shared'

export type ConsultationType = 'normal' | 'dermatology' | 'chronic'

export interface RouteDecision {
  isNewPatient: boolean
  recommendedWorkflow: 'new-consultation' | 'follow-up'
  recommendedPath: string
  consultationType: ConsultationType
  availablePaths: {
    label: string
    path: string
    description: string
    isRecommended: boolean
  }[]
  patientSummary?: {
    totalConsultations: number
    lastConsultationDate: string
    lastConsultationType: string
    chronicConditions?: string[]
  }
}

/**
 * Détermine le workflow optimal basé sur l'historique du patient
 */
export function determineOptimalRoute(
  consultationHistory: ConsultationHistoryItem[],
  selectedType: ConsultationType,
  patientData?: any
): RouteDecision {
  const isNewPatient = !consultationHistory || consultationHistory.length === 0

  if (isNewPatient) {
    // NOUVEAU PATIENT - Consultation initiale
    return {
      isNewPatient: true,
      recommendedWorkflow: 'new-consultation',
      recommendedPath: getInitialConsultationPath(selectedType),
      consultationType: selectedType,
      availablePaths: [
        {
          label: 'Consultation Normale',
          path: '/consultation',
          description: 'Première consultation médicale générale',
          isRecommended: selectedType === 'normal'
        },
        {
          label: 'Consultation Dermatologie',
          path: '/dermatology',
          description: 'Première consultation pour problèmes de peau',
          isRecommended: selectedType === 'dermatology'
        },
        {
          label: 'Consultation Maladie Chronique',
          path: '/chronic-disease',
          description: 'Première consultation pour maladie chronique',
          isRecommended: selectedType === 'chronic'
        }
      ]
    }
  }

  // PATIENT EXISTANT - Analyser l'historique
  // Note: From consultation hub, we always start NEW consultations (not follow-ups)
  // The follow-up routes are kept for future use but not used in this workflow
  const lastConsultation = consultationHistory[0]
  const lastType = detectConsultationType(lastConsultation)
  const hasMatchingHistory = consultationHistory.some(
    c => detectConsultationType(c) === selectedType
  )

  return {
    isNewPatient: false,
    recommendedWorkflow: 'new-consultation',
    recommendedPath: getInitialConsultationPath(selectedType),
    consultationType: selectedType,
    availablePaths: buildAvailablePathsForExistingPatient(
      selectedType,
      consultationHistory,
      hasMatchingHistory
    ),
    patientSummary: {
      totalConsultations: consultationHistory.length,
      lastConsultationDate: lastConsultation.date,
      lastConsultationType: lastType,
      chronicConditions: patientData?.chronicConditions
    }
  }
}

/**
 * Détecte le type de consultation depuis les données
 */
function detectConsultationType(consultation: ConsultationHistoryItem): string {
  const type = consultation.consultationType?.toLowerCase() || ''
  
  if (type.includes('derma')) return 'dermatology'
  if (type.includes('chronic') || type.includes('chronique')) return 'chronic'
  return 'normal'
}

/**
 * Retourne le chemin pour une consultation initiale
 */
function getInitialConsultationPath(type: ConsultationType): string {
  switch (type) {
    case 'dermatology':
      return '/dermatology'
    case 'chronic':
      return '/chronic-disease'
    default:
      return '/consultation'
  }
}

/**
 * Retourne le chemin pour un suivi
 */
function getFollowUpPath(type: ConsultationType): string {
  return `/follow-up/${type}`
}

/**
 * Retourne le label français du type
 */
function getTypeLabel(type: ConsultationType): string {
  switch (type) {
    case 'dermatology':
      return 'Dermatologie'
    case 'chronic':
      return 'Maladie Chronique'
    default:
      return 'Normale'
  }
}

/**
 * Build available paths for existing patient with detailed descriptions
 * Note: New consultations are now recommended (not follow-ups) from the hub workflow
 */
function buildAvailablePathsForExistingPatient(
  selectedType: ConsultationType,
  consultationHistory: ConsultationHistoryItem[],
  hasMatchingHistory: boolean
) {
  const paths = []

  // Full consultation option (recommended from hub workflow)
  if (selectedType === 'normal') {
    paths.push({
      label: '📋 Consultation Normale',
      path: '/consultation',
      description: 'Consultation complète avec questions IA et diagnostic approfondi',
      isRecommended: true
    })
  } else if (selectedType === 'dermatology') {
    paths.push({
      label: '🔬 Consultation Dermatologique',
      path: '/dermatology',
      description: 'Consultation complète avec upload d\'images, OCR, questions IA et diagnostic',
      isRecommended: true
    })
  } else if (selectedType === 'chronic') {
    paths.push({
      label: '🏥 Consultation Maladie Chronique',
      path: '/chronic-disease',
      description: 'Évaluation complète avec plan diététique et suivi personnalisé',
      isRecommended: true
    })
  }

  // Follow-up option (kept for future use, not recommended from hub)
  if (selectedType === 'normal') {
    paths.push({
      label: '🔄 Suivi Consultation Normale',
      path: '/follow-up/normal',
      description: hasMatchingHistory
        ? `Suivi médical avec analyse d'évolution (${consultationHistory.length} consultations précédentes)`
        : 'Suivi médical simplifié (nouveau type de consultation)',
      isRecommended: false
    })
  } else if (selectedType === 'dermatology') {
    paths.push({
      label: '🔄 Suivi Dermatologique',
      path: '/follow-up/dermatology',
      description: hasMatchingHistory
        ? `Comparaison d'images avant/après et analyse d'évolution (${consultationHistory.length} consultations précédentes)`
        : 'Comparaison d\'images et suivi dermatologique',
      isRecommended: false
    })
  } else if (selectedType === 'chronic') {
    paths.push({
      label: '🔄 Suivi Maladie Chronique',
      path: '/follow-up/chronic',
      description: hasMatchingHistory
        ? `Tendances des constantes vitales et compliance médicamenteuse (${consultationHistory.length} consultations précédentes)`
        : 'Suivi des paramètres chroniques',
      isRecommended: false
    })
  }

  return paths
}

/**
 * Suggestions de type basées sur l'historique
 */
export function suggestConsultationType(
  consultationHistory: ConsultationHistoryItem[]
): ConsultationType {
  if (!consultationHistory || consultationHistory.length === 0) {
    return 'normal'
  }

  const lastConsultation = consultationHistory[0]
  const detectedType = detectConsultationType(lastConsultation)

  if (detectedType === 'dermatology') return 'dermatology'
  if (detectedType === 'chronic') return 'chronic'
  return 'normal'
}
