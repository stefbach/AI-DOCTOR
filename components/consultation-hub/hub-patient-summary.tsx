'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  User,
  Calendar,
  FileText,
  Heart,
  Activity,
  Loader2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  Droplets,
  Scale
} from 'lucide-react'
import type { ConsultationHistoryItem } from '@/lib/follow-up/shared'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export interface HubPatientSummaryProps {
  patientData: {
    searchCriteria: any
    consultations: ConsultationHistoryItem[]
    totalConsultations: number
    tibokPatientInfo?: any // Patient info from Tibok URL
  }
}

// Follow-up summary types
interface FollowUpSummary {
  id: string
  disease_subtype: string
  follow_up_type: string
  status: string
  started_at: string
  frequency: string
  duration_days: number | null
  targets: Record<string, number | null>
  stats: {
    total_measures: number
    expected_measures: number
    adherence_percent: number
    in_range_percent: number
    average: string
    min: string
    max: string
    trend: 'amelioration' | 'stable' | 'degradation'
    trend_delta: string
    alert_count: number
    last_alert: { level: string; date: string } | null
  }
  ai_summary: {
    resume_clinique: string
    points_cles: {
      compliance: string
      controle: string
      tendance: string
      urgence: string
    }
    valeurs_critiques: Array<{ date: string; valeur: string; niveau: string }>
    recommandation_suivi: string
  }
}

export function HubPatientSummary({ patientData }: HubPatientSummaryProps) {
  const { searchCriteria, consultations, totalConsultations, tibokPatientInfo } = patientData
  const mostRecent = consultations[0]

  // Follow-up state
  const [activeFollowUpCount, setActiveFollowUpCount] = useState<number | null>(null)
  const [followUpData, setFollowUpData] = useState<FollowUpSummary[] | null>(null)
  const [loadingFollowUps, setLoadingFollowUps] = useState(false)
  const [followUpExpanded, setFollowUpExpanded] = useState(false)
  const [followUpError, setFollowUpError] = useState<string | null>(null)

  // Get patient ID
  const patientId = searchCriteria?.patientId || tibokPatientInfo?.patient_id || tibokPatientInfo?.id || ''

  // Check for active follow-ups on mount (lightweight POST, no AI)
  useEffect(() => {
    if (!patientId) return

    fetch('/api/follow-ups/doctor-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patientId })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setActiveFollowUpCount(data.active_count)
        }
      })
      .catch(() => {
        // Silently fail - follow-up check is not critical
      })
  }, [patientId])

  // Fetch full follow-up summary (on demand)
  const handleViewFollowUps = useCallback(async () => {
    if (!patientId) return
    if (followUpData) {
      // Toggle collapse
      setFollowUpExpanded(!followUpExpanded)
      return
    }

    setLoadingFollowUps(true)
    setFollowUpError(null)
    setFollowUpExpanded(true)

    try {
      const res = await fetch(`/api/follow-ups/doctor-summary?patientId=${encodeURIComponent(patientId)}`)
      const data = await res.json()

      if (data.success) {
        setFollowUpData(data.follow_ups)
      } else {
        setFollowUpError(data.error || 'Erreur lors du chargement')
      }
    } catch (err) {
      setFollowUpError('Erreur de connexion')
    } finally {
      setLoadingFollowUps(false)
    }
  }, [patientId, followUpData, followUpExpanded])

  // Debug: Log tibokPatientInfo to see actual field names from Tibok
  console.log('🔍 HubPatientSummary - tibokPatientInfo:', tibokPatientInfo)
  console.log('🔍 HubPatientSummary - searchCriteria:', searchCriteria)
  console.log('🔍 HubPatientSummary - mostRecent consultation:', mostRecent)
  console.log('🔍 HubPatientSummary - mostRecent.fullReport:', mostRecent?.fullReport)

  // First try to get patient info from Tibok, then fall back to consultation history
  // Handle both snake_case (from Tibok URL params) and camelCase (from sessionStorage) field names
  // Build name from multiple possible field combinations
  const buildPatientNameFromTibok = () => {
    if (!tibokPatientInfo) return ''
    // Try full_name / fullName first
    if (tibokPatientInfo.full_name) return tibokPatientInfo.full_name
    if (tibokPatientInfo.fullName) return tibokPatientInfo.fullName
    if (tibokPatientInfo.name) return tibokPatientInfo.name
    // Try first + last name combinations
    const firstName = tibokPatientInfo.first_name || tibokPatientInfo.firstName || ''
    const lastName = tibokPatientInfo.last_name || tibokPatientInfo.lastName || ''
    return `${firstName} ${lastName}`.trim()
  }

  // Get patient info from consultation history as fallback
  const historyPatientInfo = extractPatientInfo(mostRecent)
  const tibokName = buildPatientNameFromTibok()

  // Calculate age from date_of_birth if age not directly available
  const calculateAge = () => {
    if (tibokPatientInfo?.age) return tibokPatientInfo.age
    const dob = tibokPatientInfo?.date_of_birth || tibokPatientInfo?.dateOfBirth
    if (dob) {
      const birthDate = new Date(dob)
      const today = new Date()
      let age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      return age
    }
    return historyPatientInfo.age || null
  }

  // Use tibokPatientInfo only if it has a name, otherwise fallback to history
  // This handles the case where tibokPatientInfo exists but is missing name fields (common in iframe)
  const patientInfo = {
    name: tibokName || historyPatientInfo.name || '',
    age: calculateAge(),
    gender: tibokPatientInfo?.gender === 'F' ? 'Femme'
      : tibokPatientInfo?.gender === 'M' ? 'Homme'
      : tibokPatientInfo?.sexe === 'F' ? 'Femme'
      : tibokPatientInfo?.sexe === 'M' ? 'Homme'
      : tibokPatientInfo?.gender || tibokPatientInfo?.sexe || historyPatientInfo.gender || ''
  }

  // Détecter type majoritaire
  const consultationTypes = consultations.map(c => detectType(c.consultationType))
  const typeCount: Record<string, number> = {}
  consultationTypes.forEach(type => {
    typeCount[type] = (typeCount[type] || 0) + 1
  })
  const dominantType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0][0]

  return (
    <Card className="w-full border-green-200 bg-green-50">
      <CardHeader className="p-3 sm:p-4 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
              <User className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-green-900 text-base sm:text-lg">
                ✅ Patient Trouvé
              </CardTitle>
              <CardDescription className="text-green-700 text-xs sm:text-sm">
                Historique médical disponible
              </CardDescription>
            </div>
          </div>
          <Badge className="bg-green-600 text-white self-start sm:self-auto text-xs sm:text-sm">
            {totalConsultations} consultation{totalConsultations > 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 p-3 sm:p-4 md:p-6 pt-0">
        {/* Patient Identity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold text-green-900 flex items-center gap-2 text-sm sm:text-base">
              <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Identité Patient
            </h4>
            <div className="bg-white p-2 sm:p-3 rounded-lg border border-green-200">
              {patientInfo.name && (
                <p className="font-medium text-gray-900 text-sm sm:text-base">{patientInfo.name}</p>
              )}
              {(patientInfo.age || patientInfo.gender) && (
                <p className="text-xs sm:text-sm text-gray-600">
                  {patientInfo.age && `${patientInfo.age} ans`}
                  {patientInfo.age && patientInfo.gender && ' • '}
                  {patientInfo.gender}
                </p>
              )}
              {(tibokPatientInfo?.email || searchCriteria.email) && (
                <p className="text-xs sm:text-sm text-gray-600 truncate">📧 {tibokPatientInfo?.email || searchCriteria.email}</p>
              )}
              {(tibokPatientInfo?.phone || tibokPatientInfo?.phone_number || tibokPatientInfo?.telephone || searchCriteria.phone) && (
                <p className="text-xs sm:text-sm text-gray-600">📞 {tibokPatientInfo?.phone || tibokPatientInfo?.phone_number || tibokPatientInfo?.telephone || searchCriteria.phone}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-green-900 flex items-center gap-2 text-sm sm:text-base">
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Dernière Consultation
            </h4>
            <div className="bg-white p-2 sm:p-3 rounded-lg border border-green-200">
              <p className="font-medium text-gray-900 text-sm sm:text-base">
                {format(new Date(mostRecent.date), 'dd MMMM yyyy', { locale: fr })}
              </p>
              <p className="text-xs sm:text-sm text-gray-600">
                Il y a {getDaysSince(mostRecent.date)} jours
              </p>
              <Badge variant="outline" className="mt-2 text-xs">
                {getTypeIcon(dominantType)} {getTypeLabel(dominantType)}
              </Badge>
            </div>
          </div>
        </div>

        {/* Medical Summary */}
        {mostRecent.diagnosis && (
          <div className="space-y-2">
            <h4 className="font-semibold text-green-900 flex items-center gap-2 text-sm sm:text-base">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Dernier Diagnostic
            </h4>
            <div className="bg-white p-2 sm:p-3 rounded-lg border border-green-200">
              <p className="text-xs sm:text-sm text-gray-700 line-clamp-2 sm:line-clamp-3">
                {mostRecent.diagnosis}
              </p>
            </div>
          </div>
        )}

        {/* Recent Vitals */}
        {mostRecent.vitalSigns && Object.keys(mostRecent.vitalSigns).length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-green-900 flex items-center gap-2 text-sm sm:text-base">
              <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Dernières Constantes
            </h4>
            <div className="bg-white p-2 sm:p-3 rounded-lg border border-green-200">
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {mostRecent.vitalSigns.bloodPressure && (
                  <Badge variant="outline" className="text-xs">
                    <Heart className="h-3 w-3 mr-1" />
                    TA: {mostRecent.vitalSigns.bloodPressure}
                  </Badge>
                )}
                {mostRecent.vitalSigns.weight && (
                  <Badge variant="outline" className="text-xs">
                    Poids: {mostRecent.vitalSigns.weight} kg
                  </Badge>
                )}
                {mostRecent.vitalSigns.temperature && (
                  <Badge variant="outline" className="text-xs">
                    T°: {mostRecent.vitalSigns.temperature}°C
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Follow-Up Section */}
        {activeFollowUpCount !== null && activeFollowUpCount > 0 && (
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-between border-purple-300 bg-purple-50 hover:bg-purple-100 text-purple-900"
              onClick={handleViewFollowUps}
              disabled={loadingFollowUps}
            >
              <span className="flex items-center gap-2">
                {loadingFollowUps ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Activity className="h-4 w-4" />
                )}
                <span className="font-semibold">
                  {loadingFollowUps ? 'Chargement du suivi...' : 'Voir Suivi Chronique'}
                </span>
                <Badge className="bg-purple-600 text-white ml-2">
                  {activeFollowUpCount} actif{activeFollowUpCount > 1 ? 's' : ''}
                </Badge>
              </span>
              {followUpData && (
                followUpExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
              )}
            </Button>

            {/* Follow-up error */}
            {followUpError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {followUpError}
              </div>
            )}

            {/* Follow-up cards */}
            {followUpData && followUpExpanded && (
              <div className="space-y-3">
                {followUpData.map(fu => (
                  <FollowUpCard key={fu.id} followUp={fu} />
                ))}
              </div>
            )}
          </div>
        )}

      </CardContent>
    </Card>
  )
}

// === Follow-Up Card Component ===
function FollowUpCard({ followUp }: { followUp: FollowUpSummary }) {
  const { stats, ai_summary } = followUp
  const label = getFollowUpLabel(followUp.disease_subtype)
  const icon = getFollowUpIcon(followUp.follow_up_type)
  const borderColor = getFollowUpBorderColor(followUp.follow_up_type)

  const complianceBadge = getBadgeStyle(ai_summary.points_cles.compliance, {
    bonne: 'bg-green-100 text-green-800',
    moyenne: 'bg-yellow-100 text-yellow-800',
    faible: 'bg-red-100 text-red-800',
  })

  const controleBadge = getBadgeStyle(ai_summary.points_cles.controle, {
    bon: 'bg-green-100 text-green-800',
    partiel: 'bg-yellow-100 text-yellow-800',
    insuffisant: 'bg-red-100 text-red-800',
  })

  const urgenceBadge = getBadgeStyle(ai_summary.points_cles.urgence, {
    aucune: 'bg-gray-100 text-gray-700',
    surveillance: 'bg-yellow-100 text-yellow-800',
    action_requise: 'bg-red-100 text-red-800',
  })

  return (
    <div className={`bg-white rounded-lg border-2 ${borderColor} p-3 sm:p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h5 className="font-semibold text-gray-900 text-sm sm:text-base">{label}</h5>
        </div>
        <span className="text-xs text-gray-500">
          Depuis {format(new Date(followUp.started_at), 'dd/MM/yyyy')}
        </span>
      </div>

      {/* Key Points Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge className={`text-xs ${complianceBadge}`}>
          Compliance: {ai_summary.points_cles.compliance}
        </Badge>
        <Badge className={`text-xs ${controleBadge}`}>
          Contrôle: {ai_summary.points_cles.controle}
        </Badge>
        <Badge className={`text-xs ${getTrendBadgeStyle(ai_summary.points_cles.tendance)}`}>
          {getTrendIcon(ai_summary.points_cles.tendance)}
          Tendance: {ai_summary.points_cles.tendance}
        </Badge>
        <Badge className={`text-xs ${urgenceBadge}`}>
          Urgence: {ai_summary.points_cles.urgence}
        </Badge>
      </div>

      {/* AI Clinical Summary */}
      <div className="bg-gray-50 p-3 rounded-lg">
        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
          {ai_summary.resume_clinique}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-blue-50 p-2 rounded text-center">
          <p className="text-xs text-gray-500">Mesures</p>
          <p className="font-semibold text-sm">{stats.total_measures}/{stats.expected_measures}</p>
          <p className="text-xs text-gray-500">{stats.adherence_percent}% adhérence</p>
        </div>
        <div className="bg-green-50 p-2 rounded text-center">
          <p className="text-xs text-gray-500">Moyenne</p>
          <p className="font-semibold text-sm">{stats.average}</p>
        </div>
        <div className="bg-purple-50 p-2 rounded text-center">
          <p className="text-xs text-gray-500">Dans normes</p>
          <p className="font-semibold text-sm">{stats.in_range_percent}%</p>
        </div>
        <div className="bg-orange-50 p-2 rounded text-center">
          <p className="text-xs text-gray-500">Alertes</p>
          <p className={`font-semibold text-sm ${stats.alert_count > 0 ? 'text-red-600' : 'text-gray-700'}`}>
            {stats.alert_count}/{stats.total_measures}
          </p>
        </div>
      </div>

      {/* Critical Values */}
      {ai_summary.valeurs_critiques && ai_summary.valeurs_critiques.length > 0 && (
        <div className="bg-red-50 border border-red-200 p-2 sm:p-3 rounded-lg">
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-xs font-semibold text-red-700">Valeurs critiques récentes</span>
          </div>
          {ai_summary.valeurs_critiques.map((vc, i) => (
            <p key={i} className="text-xs text-red-700">
              <Badge className={`text-[10px] mr-1 ${vc.niveau === 'ROUGE' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white'}`}>
                {vc.niveau}
              </Badge>
              {vc.valeur} — {vc.date ? format(new Date(vc.date), 'dd/MM/yyyy') : ''}
            </p>
          ))}
        </div>
      )}

      {/* AI Recommendation */}
      {ai_summary.recommandation_suivi && (
        <div className="bg-blue-50 border border-blue-200 p-2 sm:p-3 rounded-lg">
          <p className="text-xs sm:text-sm text-blue-800">
            <span className="font-semibold">Recommandation:</span> {ai_summary.recommandation_suivi}
          </p>
        </div>
      )}
    </div>
  )
}

// === Helper Functions ===

function getFollowUpLabel(subtype: string): string {
  const labels: Record<string, string> = {
    hypertension: 'Hypertension Artérielle (HTA)',
    diabetes_type_1: 'Diabète de Type 1',
    diabetes_type_2: 'Diabète de Type 2',
    obesity: 'Obésité',
    blood_pressure: 'Tension Artérielle',
    glycemia_type_1: 'Glycémie Type 1',
    glycemia_type_2: 'Glycémie Type 2',
    weight: 'Poids',
  }
  return labels[subtype] || subtype
}

function getFollowUpIcon(type: string) {
  switch (type) {
    case 'blood_pressure':
      return <Droplets className="h-5 w-5 text-red-600" />
    case 'glycemia_type_1':
    case 'glycemia_type_2':
    case 'glycemia':
      return <Activity className="h-5 w-5 text-orange-600" />
    case 'weight':
      return <Scale className="h-5 w-5 text-blue-600" />
    default:
      return <Activity className="h-5 w-5 text-purple-600" />
  }
}

function getFollowUpBorderColor(type: string): string {
  switch (type) {
    case 'blood_pressure': return 'border-red-200'
    case 'glycemia_type_1': return 'border-orange-200'
    case 'glycemia_type_2': return 'border-amber-200'
    case 'weight': return 'border-blue-200'
    default: return 'border-gray-200'
  }
}

function getBadgeStyle(value: string, map: Record<string, string>): string {
  return map[value] || 'bg-gray-100 text-gray-700'
}

function getTrendBadgeStyle(trend: string): string {
  switch (trend) {
    case 'amelioration': return 'bg-green-100 text-green-800'
    case 'stable': return 'bg-blue-100 text-blue-800'
    case 'degradation': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-700'
  }
}

function getTrendIcon(trend: string) {
  switch (trend) {
    case 'amelioration': return <TrendingDown className="h-3 w-3 mr-1 inline" />
    case 'degradation': return <TrendingUp className="h-3 w-3 mr-1 inline" />
    default: return <Minus className="h-3 w-3 mr-1 inline" />
  }
}

function extractPatientInfo(consultation: ConsultationHistoryItem) {
  console.log('🔍 extractPatientInfo - consultation:', consultation)

  // Try to extract from fullReport if available
  if (consultation.fullReport) {
    const report = consultation.fullReport
    console.log('🔍 extractPatientInfo - report keys:', Object.keys(report))

    // Try multiple possible locations for patient data
    let name = ''
    let age = null
    let gender = ''

    // French format (compteRendu)
    if (report?.compteRendu?.patient) {
      const patient = report.compteRendu.patient
      name = patient.nom || patient.fullName || patient.name || ''
      age = patient.age || null
      gender = patient.sexe || patient.gender || ''
    }

    // English format (medicalReport)
    if (!name && report?.medicalReport?.patient) {
      const patient = report.medicalReport.patient
      name = patient.fullName || patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
      age = patient.age || null
      gender = patient.gender || patient.sex || ''
    }

    // Try header section
    if (!name && report?.medicalReport?.header) {
      const header = report.medicalReport.header
      name = header.patientName || ''
    }

    // Try direct patient object in report
    if (!name && report?.patient) {
      const patient = report.patient
      name = patient.fullName || patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
      age = age || patient.age
      gender = gender || patient.gender || patient.sex || ''
    }

    // Try ordonnance section for patient name
    if (!name && report?.ordonnance?.patient) {
      const patient = report.ordonnance.patient
      name = patient.nom || patient.name || ''
      age = age || patient.age
    }

    // Try consultation_report structure (new format)
    if (!name && report?.consultation_report?.content?.patient) {
      const patient = report.consultation_report.content.patient
      name = patient.fullName || patient.name || `${patient.firstName || ''} ${patient.lastName || ''}`.trim()
      age = age || patient.age
      gender = gender || patient.gender || patient.sex || ''
    }

    // Try prescriptions structure for patient info
    if (!name && report?.prescriptions?.content?.patient) {
      const patient = report.prescriptions.content.patient
      name = patient.fullName || patient.name || patient.nom || ''
      age = age || patient.age
      gender = gender || patient.gender || patient.sexe || ''
    }

    // Try to calculate age from date of birth if not directly available
    if (!age && report?.medicalReport?.patient?.dateOfBirth) {
      const dob = new Date(report.medicalReport.patient.dateOfBirth)
      const today = new Date()
      age = Math.floor((today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    }

    if (!age && report?.compteRendu?.patient?.dateNaissance) {
      const dob = new Date(report.compteRendu.patient.dateNaissance)
      const today = new Date()
      age = Math.floor((today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    }

    if (!age && report?.consultation_report?.content?.patient?.dateOfBirth) {
      const dob = new Date(report.consultation_report.content.patient.dateOfBirth)
      const today = new Date()
      age = Math.floor((today.getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    }

    return { name, age, gender }
  }

  return { name: '', age: null, gender: '' }
}

function detectType(consultationType?: string): string {
  if (!consultationType) return 'normal'
  const type = consultationType.toLowerCase()
  if (type.includes('derma')) return 'dermatology'
  if (type.includes('chronic') || type.includes('chronique')) return 'chronic'
  return 'normal'
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'dermatology': return 'Dermatologie'
    case 'chronic': return 'Chronique'
    default: return 'Normale'
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'dermatology': return '👁️'
    case 'chronic': return '❤️'
    default: return '🩺'
  }
}

function getDaysSince(dateString: string): number {
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}
