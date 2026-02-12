// lib/follow-up-stats.ts - Shared utility for follow-up stats computation
// Used by: /api/follow-ups/doctor-summary (hub) and chronic report generation

export interface FollowUpRecord {
  id: string
  patient_id: string
  follow_up_type: string
  disease_subtype: string | null
  frequency: string
  status: string
  started_at: string
  duration_days: number | null
  target_min: number | null
  target_max: number | null
  target_systolic_max: number | null
  target_diastolic_max: number | null
  target_systolic_min: number | null
  target_diastolic_min: number | null
  baseline_weight: number | null
  measurement_times: string[] | null
  escalation_config: any
  protocol_config: any
}

export interface MeasurementRecord {
  id: string
  follow_up_id: string
  patient_id: string
  measurement_type: string
  value_1: number
  value_2: number | null
  unit: string
  measured_at: string
  heart_rate: number | null
  waist_cm: number | null
  is_alert: boolean
  escalation_status: string | null
  ai_analysis: any
  measurement_tag: string | null
  source: string | null
}

export interface FollowUpStats {
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

export interface FollowUpWithStats {
  id: string
  disease_subtype: string
  follow_up_type: string
  status: string
  started_at: string
  frequency: string
  duration_days: number | null
  targets: Record<string, number | null>
  stats: FollowUpStats
  measurements: MeasurementRecord[]
  formatted_table: string
}

// Default targets when not set in DB
const DEFAULT_TARGETS: Record<string, Record<string, number>> = {
  blood_pressure: { systolic_max: 135, diastolic_max: 85 },
  glycemia_type_1: { min: 0.70, max: 1.30 },
  glycemia_type_2: { min: 0.80, max: 1.30 },
  glycemia: { min: 0.70, max: 1.30 },
  weight: {},
}

function daysBetween(dateA: Date, dateB: Date): number {
  return Math.abs(dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24)
}

function computeExpectedMeasures(followUp: FollowUpRecord): number {
  const startDate = new Date(followUp.started_at)
  const now = new Date()
  const daysSinceStart = daysBetween(now, startDate)
  const weeksActive = daysSinceStart / 7
  const timesPerDay = Array.isArray(followUp.measurement_times)
    ? followUp.measurement_times.length
    : 1

  switch (followUp.frequency) {
    case 'daily':
      return Math.round(timesPerDay * daysSinceStart)
    case 'every_2_days':
      return Math.round(timesPerDay * Math.ceil(daysSinceStart / 2))
    case 'twice_weekly':
      return Math.round(timesPerDay * 2 * weeksActive)
    case 'three_days_weekly':
      return Math.round(timesPerDay * 3 * weeksActive)
    case 'weekly':
      return Math.round(timesPerDay * weeksActive)
    default:
      return Math.round(timesPerDay * daysSinceStart)
  }
}

function filterByDateRange(measurements: MeasurementRecord[], daysAgo: number, daysAgoPrev: number): MeasurementRecord[] {
  const now = new Date()
  return measurements.filter(m => {
    const d = daysBetween(now, new Date(m.measured_at))
    return d >= daysAgo && d < daysAgoPrev
  })
}

export function computeStats(followUp: FollowUpRecord, measurements: MeasurementRecord[]): FollowUpStats {
  const type = followUp.follow_up_type
  const total = measurements.length
  const expected = Math.max(computeExpectedMeasures(followUp), 1)
  const adherence = Math.min(Math.round((total / expected) * 100), 100)
  const alertCount = measurements.filter(m => m.is_alert).length

  // Find last alert
  const alertMeasurements = measurements.filter(m => m.is_alert).sort(
    (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime()
  )
  const lastAlert = alertMeasurements.length > 0
    ? {
        level: alertMeasurements[0].escalation_status === 'critical' ? 'ROUGE' : 'ORANGE',
        date: new Date(alertMeasurements[0].measured_at).toISOString().split('T')[0]
      }
    : null

  if (type === 'blood_pressure') {
    return computeBloodPressureStats(followUp, measurements, total, expected, adherence, alertCount, lastAlert)
  } else if (type.startsWith('glycemia')) {
    return computeGlycemiaStats(followUp, measurements, total, expected, adherence, alertCount, lastAlert)
  } else if (type === 'weight') {
    return computeWeightStats(followUp, measurements, total, expected, adherence, alertCount, lastAlert)
  }

  // Fallback
  return {
    total_measures: total,
    expected_measures: expected,
    adherence_percent: adherence,
    in_range_percent: 0,
    average: 'N/A',
    min: 'N/A',
    max: 'N/A',
    trend: 'stable',
    trend_delta: 'N/A',
    alert_count: alertCount,
    last_alert: lastAlert,
  }
}

function computeBloodPressureStats(
  followUp: FollowUpRecord,
  measurements: MeasurementRecord[],
  total: number, expected: number, adherence: number,
  alertCount: number, lastAlert: { level: string; date: string } | null
): FollowUpStats {
  const sysMax = followUp.target_systolic_max ?? DEFAULT_TARGETS.blood_pressure.systolic_max
  const diaMax = followUp.target_diastolic_max ?? DEFAULT_TARGETS.blood_pressure.diastolic_max

  if (total === 0) {
    return { total_measures: 0, expected_measures: expected, adherence_percent: 0, in_range_percent: 0, average: 'N/A', min: 'N/A', max: 'N/A', trend: 'stable', trend_delta: 'N/A', alert_count: 0, last_alert: null }
  }

  const sysValues = measurements.map(m => m.value_1)
  const diaValues = measurements.map(m => m.value_2 ?? 0)

  const avgSys = Math.round(sysValues.reduce((a, b) => a + b, 0) / total)
  const avgDia = Math.round(diaValues.reduce((a, b) => a + b, 0) / total)

  const inRange = measurements.filter(m => m.value_1 < sysMax && (m.value_2 ?? 0) < diaMax).length
  const inRangePercent = Math.round((inRange / total) * 100)

  const minSys = Math.round(Math.min(...sysValues))
  const maxSys = Math.round(Math.max(...sysValues))
  const minDia = Math.round(Math.min(...diaValues))
  const maxDia = Math.round(Math.max(...diaValues))

  // Trend: last 7 days vs previous 7 days
  const last7 = filterByDateRange(measurements, 0, 7)
  const prev7 = filterByDateRange(measurements, 7, 14)

  let trend: 'amelioration' | 'stable' | 'degradation' = 'stable'
  let trendDelta = 'N/A'

  if (last7.length > 0 && prev7.length > 0) {
    const last7AvgSys = last7.reduce((a, m) => a + m.value_1, 0) / last7.length
    const prev7AvgSys = prev7.reduce((a, m) => a + m.value_1, 0) / prev7.length
    const last7AvgDia = last7.reduce((a, m) => a + (m.value_2 ?? 0), 0) / last7.length
    const prev7AvgDia = prev7.reduce((a, m) => a + (m.value_2 ?? 0), 0) / prev7.length

    const deltaSys = Math.round(last7AvgSys - prev7AvgSys)
    const deltaDia = Math.round(last7AvgDia - prev7AvgDia)
    trendDelta = `${deltaSys > 0 ? '+' : ''}${deltaSys}/${deltaDia > 0 ? '+' : ''}${deltaDia} mmHg`

    if (deltaSys > 5) trend = 'degradation'
    else if (deltaSys < -5) trend = 'amelioration'
  }

  return {
    total_measures: total,
    expected_measures: expected,
    adherence_percent: adherence,
    in_range_percent: inRangePercent,
    average: `${avgSys}/${avgDia} mmHg`,
    min: `${minSys}/${minDia} mmHg`,
    max: `${maxSys}/${maxDia} mmHg`,
    trend,
    trend_delta: trendDelta,
    alert_count: alertCount,
    last_alert: lastAlert,
  }
}

function computeGlycemiaStats(
  followUp: FollowUpRecord,
  measurements: MeasurementRecord[],
  total: number, expected: number, adherence: number,
  alertCount: number, lastAlert: { level: string; date: string } | null
): FollowUpStats {
  const defaultTargets = DEFAULT_TARGETS[followUp.follow_up_type] || DEFAULT_TARGETS.glycemia
  const targetMin = followUp.target_min ?? defaultTargets.min
  const targetMax = followUp.target_max ?? defaultTargets.max

  if (total === 0) {
    return { total_measures: 0, expected_measures: expected, adherence_percent: 0, in_range_percent: 0, average: 'N/A', min: 'N/A', max: 'N/A', trend: 'stable', trend_delta: 'N/A', alert_count: 0, last_alert: null }
  }

  const values = measurements.map(m => m.value_1)
  const avg = (values.reduce((a, b) => a + b, 0) / total).toFixed(2)
  const minVal = Math.min(...values).toFixed(2)
  const maxVal = Math.max(...values).toFixed(2)

  const inRange = measurements.filter(m => m.value_1 >= targetMin && m.value_1 <= targetMax).length
  const inRangePercent = Math.round((inRange / total) * 100)

  // Trend
  const last7 = filterByDateRange(measurements, 0, 7)
  const prev7 = filterByDateRange(measurements, 7, 14)

  let trend: 'amelioration' | 'stable' | 'degradation' = 'stable'
  let trendDelta = 'N/A'

  if (last7.length > 0 && prev7.length > 0) {
    const last7Avg = last7.reduce((a, m) => a + m.value_1, 0) / last7.length
    const prev7Avg = prev7.reduce((a, m) => a + m.value_1, 0) / prev7.length
    const delta = last7Avg - prev7Avg
    trendDelta = `${delta > 0 ? '+' : ''}${delta.toFixed(2)} g/L`

    if (delta > 0.15) trend = 'degradation'
    else if (delta < -0.15) trend = 'amelioration'
  }

  return {
    total_measures: total,
    expected_measures: expected,
    adherence_percent: adherence,
    in_range_percent: inRangePercent,
    average: `${avg} g/L`,
    min: `${minVal} g/L`,
    max: `${maxVal} g/L`,
    trend,
    trend_delta: trendDelta,
    alert_count: alertCount,
    last_alert: lastAlert,
  }
}

function computeWeightStats(
  followUp: FollowUpRecord,
  measurements: MeasurementRecord[],
  total: number, expected: number, adherence: number,
  alertCount: number, lastAlert: { level: string; date: string } | null
): FollowUpStats {
  if (total === 0) {
    return { total_measures: 0, expected_measures: expected, adherence_percent: 0, in_range_percent: 0, average: 'N/A', min: 'N/A', max: 'N/A', trend: 'stable', trend_delta: 'N/A', alert_count: 0, last_alert: null }
  }

  const values = measurements.map(m => m.value_1)
  const avg = (values.reduce((a, b) => a + b, 0) / total).toFixed(1)
  const minVal = Math.min(...values).toFixed(1)
  const maxVal = Math.max(...values).toFixed(1)

  // In range: compare to baseline
  const baseline = followUp.baseline_weight
  let inRangePercent = 0
  if (baseline) {
    const inRange = measurements.filter(m => {
      const pctChange = Math.abs((m.value_1 - baseline) / baseline) * 100
      return pctChange < 5 // Within 5% of baseline
    }).length
    inRangePercent = Math.round((inRange / total) * 100)
  }

  // Trend: weekly delta
  const sorted = [...measurements].sort(
    (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime()
  )

  let trend: 'amelioration' | 'stable' | 'degradation' = 'stable'
  let trendDelta = 'N/A'

  if (sorted.length >= 2) {
    const latest = sorted[0].value_1
    const previous = sorted[1].value_1
    const delta = latest - previous
    trendDelta = `${delta > 0 ? '+' : ''}${delta.toFixed(1)} kg`

    // For weight loss goals, gaining is degradation
    if (delta > 0.5) trend = 'degradation'
    else if (delta < -0.5) trend = 'amelioration'
  }

  return {
    total_measures: total,
    expected_measures: expected,
    adherence_percent: adherence,
    in_range_percent: inRangePercent,
    average: `${avg} kg`,
    min: `${minVal} kg`,
    max: `${maxVal} kg`,
    trend,
    trend_delta: trendDelta,
    alert_count: alertCount,
    last_alert: lastAlert,
  }
}

// Format measurements as readable table for AI prompt
export function formatMeasurementsTable(followUp: FollowUpRecord, measurements: MeasurementRecord[]): string {
  const type = followUp.follow_up_type

  if (measurements.length === 0) return 'Aucune mesure enregistree.'

  const sorted = [...measurements].sort(
    (a, b) => new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime()
  )

  if (type === 'blood_pressure') {
    const header = 'Date            | Heure | Systolique | Diastolique | FC  | Tag           | Alerte'
    const rows = sorted.map(m => {
      const dt = new Date(m.measured_at)
      const date = dt.toISOString().slice(0, 10)
      const time = dt.toTimeString().slice(0, 5)
      const tag = m.measurement_tag || '-'
      const alert = m.is_alert ? 'OUI' : 'non'
      return `${date} ${time}| ${tag.padEnd(6)}| ${String(Math.round(m.value_1)).padEnd(11)}| ${String(Math.round(m.value_2 ?? 0)).padEnd(12)}| ${String(m.heart_rate ?? '-').padEnd(4)}| ${tag.padEnd(14)}| ${alert}`
    })
    return [header, ...rows].join('\n')
  }

  if (type.startsWith('glycemia')) {
    const header = 'Date            | Heure | Glycemie (g/L) | Tag             | Alerte'
    const rows = sorted.map(m => {
      const dt = new Date(m.measured_at)
      const date = dt.toISOString().slice(0, 10)
      const time = dt.toTimeString().slice(0, 5)
      const tag = m.measurement_tag || '-'
      const alert = m.is_alert ? 'OUI' : 'non'
      return `${date} ${time}| ${tag.padEnd(6)}| ${String(m.value_1).padEnd(15)}| ${tag.padEnd(16)}| ${alert}`
    })
    return [header, ...rows].join('\n')
  }

  if (type === 'weight') {
    const header = 'Date            | Poids (kg) | Tour taille (cm) | Delta sem. | Alerte'
    const rows = sorted.map((m, i) => {
      const dt = new Date(m.measured_at)
      const date = dt.toISOString().slice(0, 10)
      const waist = m.waist_cm ? String(m.waist_cm) : '-'
      const delta = i < sorted.length - 1
        ? `${(m.value_1 - sorted[i + 1].value_1) > 0 ? '+' : ''}${(m.value_1 - sorted[i + 1].value_1).toFixed(1)} kg`
        : '-'
      const alert = m.is_alert ? 'OUI' : 'non'
      return `${date.padEnd(16)}| ${String(m.value_1).padEnd(11)}| ${waist.padEnd(17)}| ${delta.padEnd(11)}| ${alert}`
    })
    return [header, ...rows].join('\n')
  }

  return 'Format de mesure non reconnu.'
}

// Build the targets object for API response
export function getTargets(followUp: FollowUpRecord): Record<string, number | null> {
  const type = followUp.follow_up_type

  if (type === 'blood_pressure') {
    return {
      systolic_max: followUp.target_systolic_max ?? 135,
      diastolic_max: followUp.target_diastolic_max ?? 85,
    }
  }

  if (type.startsWith('glycemia')) {
    const defaults = DEFAULT_TARGETS[type] || DEFAULT_TARGETS.glycemia
    return {
      min: followUp.target_min ?? defaults.min,
      max: followUp.target_max ?? defaults.max,
    }
  }

  if (type === 'weight') {
    return {
      baseline_weight: followUp.baseline_weight,
    }
  }

  return {}
}

// Get French label for disease subtype
export function getDiseaseLabel(subtype: string): string {
  const labels: Record<string, string> = {
    hypertension: 'Hypertension Artérielle (HTA)',
    diabetes_type_1: 'Diabète de Type 1',
    diabetes_type_2: 'Diabète de Type 2',
    obesity: 'Obésité',
  }
  return labels[subtype] || subtype
}
