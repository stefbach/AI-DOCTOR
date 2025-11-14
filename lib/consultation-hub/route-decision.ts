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
  const lastConsultation = consultationHistory[0]
  const lastType = detectConsultationType(lastConsultation)
  const hasMatchingHistory = consultationHistory.some(
    c => detectConsultationType(c) === selectedType
  )

  return {
    isNewPatient: false,
    recommendedWorkflow: 'follow-up',
    recommendedPath: getFollowUpPath(selectedType),
    consultationType: selectedType,
    availablePaths: [
      {
        label: `🔄 Suivi ${getTypeLabel(selectedType)}`,
        path: getFollowUpPath(selectedType),
        description: hasMatchingHistory
          ? `Consultation de suivi avec analyse d'évolution (${consultationHistory.length} consultations précédentes)`
          : `Consultation de suivi (nouveau type de consultation)`,
        isRecommended: true
      },
      {
        label: `📋 Nouvelle Consultation ${getTypeLabel(selectedType)}`,
        path: getInitialConsultationPath(selectedType),
        description: 'Consultation initiale (si nouveau problème distinct)',
        isRecommended: false
      }
    ],
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
