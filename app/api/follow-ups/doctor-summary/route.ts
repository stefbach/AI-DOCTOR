// app/api/follow-ups/doctor-summary/route.ts
// Fetches active follow-ups + measurements, computes stats, generates AI summary
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import {
  computeStats,
  formatMeasurementsTable,
  getTargets,
  getDiseaseLabel,
  type FollowUpRecord,
  type MeasurementRecord,
  type FollowUpWithStats,
} from '@/lib/follow-up-stats'

export const runtime = 'nodejs'

function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function GET(req: NextRequest) {
  const patientId = req.nextUrl.searchParams.get('patientId')

  if (!patientId) {
    return NextResponse.json({ success: false, error: 'patientId is required' }, { status: 400 })
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 })
  }

  try {
    // === Query 1: Get active follow-ups ===
    const { data: followUps, error: followUpError } = await supabase
      .from('patient_follow_ups')
      .select('id, patient_id, follow_up_type, disease_subtype, frequency, status, started_at, duration_days, target_min, target_max, target_systolic_max, target_diastolic_max, target_systolic_min, target_diastolic_min, baseline_weight, measurement_times, escalation_config, protocol_config')
      .eq('patient_id', patientId)
      .eq('status', 'active')

    if (followUpError) {
      console.error('Error fetching follow-ups:', followUpError)
      return NextResponse.json({ success: false, error: 'Failed to fetch follow-ups' }, { status: 500 })
    }

    if (!followUps || followUps.length === 0) {
      return NextResponse.json({ success: true, follow_ups: [] })
    }

    // === Query 2: Get ALL measurements for all follow-up IDs (single query) ===
    const followUpIds = followUps.map(f => f.id)
    const { data: allMeasurements, error: measurementError } = await supabase
      .from('patient_measurements')
      .select('id, follow_up_id, patient_id, measurement_type, value_1, value_2, unit, measured_at, heart_rate, waist_cm, is_alert, escalation_status, ai_analysis, measurement_tag, source')
      .in('follow_up_id', followUpIds)
      .order('measured_at', { ascending: false })
      .limit(90) // 30 per follow-up max, up to 3 follow-ups

    if (measurementError) {
      console.error('Error fetching measurements:', measurementError)
      return NextResponse.json({ success: false, error: 'Failed to fetch measurements' }, { status: 500 })
    }

    // Group measurements by follow_up_id
    const measurementsByFollowUp: Record<string, MeasurementRecord[]> = {}
    for (const m of (allMeasurements || [])) {
      if (!measurementsByFollowUp[m.follow_up_id]) {
        measurementsByFollowUp[m.follow_up_id] = []
      }
      // Cap at 30 per follow-up
      if (measurementsByFollowUp[m.follow_up_id].length < 30) {
        measurementsByFollowUp[m.follow_up_id].push(m as MeasurementRecord)
      }
    }

    // === Compute stats for each follow-up ===
    const followUpsWithStats: FollowUpWithStats[] = followUps.map(fu => {
      const fuRecord = fu as FollowUpRecord
      const measurements = measurementsByFollowUp[fu.id] || []
      const stats = computeStats(fuRecord, measurements)
      const targets = getTargets(fuRecord)
      const formattedTable = formatMeasurementsTable(fuRecord, measurements)

      return {
        id: fu.id,
        disease_subtype: fu.disease_subtype || fu.follow_up_type,
        follow_up_type: fu.follow_up_type,
        status: fu.status,
        started_at: fu.started_at,
        frequency: fu.frequency,
        duration_days: fu.duration_days,
        targets,
        stats,
        measurements,
        formatted_table: formattedTable,
      }
    })

    // === Single AI call for all follow-ups ===
    let aiSummaries: Record<string, any> = {}

    try {
      const aiPrompt = buildAIPrompt(followUpsWithStats)
      const result = await generateText({
        model: openai('gpt-5.2', { reasoningEffort: 'none' }),
        messages: [
          { role: 'system', content: AI_SYSTEM_PROMPT },
          { role: 'user', content: aiPrompt },
        ],
        maxTokens: 2000,
        temperature: 0.3,
      })

      const content = result.text
      if (content) {
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            // If single follow-up, the response is the summary directly
            if (followUpsWithStats.length === 1) {
              aiSummaries[followUpsWithStats[0].id] = parsed
            } else {
              // Multiple follow-ups: response has keys matching follow-up IDs or disease_subtypes
              for (const fu of followUpsWithStats) {
                aiSummaries[fu.id] = parsed[fu.disease_subtype] || parsed[fu.follow_up_type] || parsed[fu.id] || null
              }
            }
          }
        } catch (parseErr) {
          console.error('Failed to parse AI response:', parseErr)
        }
      }
    } catch (aiErr) {
      console.error('AI generation error:', aiErr)
    }

    // === Build final response ===
    const response = followUpsWithStats.map(fu => ({
      id: fu.id,
      disease_subtype: fu.disease_subtype,
      follow_up_type: fu.follow_up_type,
      status: fu.status,
      started_at: fu.started_at,
      frequency: fu.frequency,
      duration_days: fu.duration_days,
      targets: fu.targets,
      stats: fu.stats,
      measurements: fu.measurements,
      ai_summary: aiSummaries[fu.id] || {
        resume_clinique: 'Analyse IA non disponible pour le moment.',
        points_cles: { compliance: 'N/A', controle: 'N/A', tendance: 'N/A', urgence: 'N/A' },
        valeurs_critiques: [],
        recommandation_suivi: '',
      },
    }))

    return NextResponse.json({ success: true, follow_ups: response })
  } catch (err) {
    console.error('Doctor summary error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// Also support a lightweight check (no AI, no measurements)
export async function POST(req: NextRequest) {
  const { patientId } = await req.json()

  if (!patientId) {
    return NextResponse.json({ success: false, error: 'patientId is required' }, { status: 400 })
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Database not configured' }, { status: 500 })
  }

  try {
    const { count, error } = await supabase
      .from('patient_follow_ups')
      .select('id', { count: 'exact', head: true })
      .eq('patient_id', patientId)
      .eq('status', 'active')

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to check follow-ups' }, { status: 500 })
    }

    return NextResponse.json({ success: true, active_count: count || 0 })
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// === AI Prompt ===
const AI_SYSTEM_PROMPT = `Tu es un assistant de synthese clinique. Tu resumes les donnees de suivi d'un patient atteint de maladie chronique pour le medecin traitant. Tu ne poses PAS de diagnostic et tu ne modifies PAS le traitement.`

function buildAIPrompt(followUps: FollowUpWithStats[]): string {
  if (followUps.length === 1) {
    return buildSingleFollowUpPrompt(followUps[0])
  }

  // Multiple follow-ups: ask for keyed response
  let prompt = `Ce patient a ${followUps.length} suivis actifs. Genere un resume pour CHAQUE suivi.\n\n`

  for (const fu of followUps) {
    prompt += `--- SUIVI: ${fu.disease_subtype} ---\n`
    prompt += buildFollowUpContext(fu)
    prompt += '\n\n'
  }

  prompt += `FORMAT DE SORTIE (JSON avec une cle par suivi):
{
  "${followUps.map(f => f.disease_subtype).join('": {...}, "')}":{...}
}

Chaque suivi doit avoir ce format:
{
  "resume_clinique": "string (3-5 phrases en francais)",
  "points_cles": {
    "compliance": "bonne|moyenne|faible",
    "controle": "bon|partiel|insuffisant",
    "tendance": "amelioration|stable|degradation",
    "urgence": "aucune|surveillance|action_requise"
  },
  "valeurs_critiques": [
    { "date": "ISO", "valeur": "string", "niveau": "ROUGE|ORANGE" }
  ],
  "recommandation_suivi": "string (1-2 phrases)"
}

Retourne UNIQUEMENT le JSON, sans texte additionnel.`

  return prompt
}

function buildSingleFollowUpPrompt(fu: FollowUpWithStats): string {
  let prompt = buildFollowUpContext(fu)

  prompt += `\nINSTRUCTIONS
1. Redige un RESUME CLINIQUE en 3-5 phrases pour le medecin:
   - Etat general du suivi (bien controle / partiellement controle / mal controle)
   - Tendance recente (amelioration / stable / degradation)
   - Points d'attention (pics, hypos repetees, non-adherence, etc.)
   - Suggestion de suivi (maintenir / renforcer / teleconsultation recommandee)

2. Genere un tableau POINTS CLES:
   - compliance: "bonne" | "moyenne" | "faible"
   - controle: "bon" | "partiel" | "insuffisant"
   - tendance: "amelioration" | "stable" | "degradation"
   - urgence: "aucune" | "surveillance" | "action_requise"

3. Si le patient a des valeurs critiques recentes (< 48h), signale-les
   explicitement avec la date et la valeur.

FORMAT DE SORTIE (JSON):
{
  "resume_clinique": "string (3-5 phrases en francais)",
  "points_cles": {
    "compliance": "bonne|moyenne|faible",
    "controle": "bon|partiel|insuffisant",
    "tendance": "amelioration|stable|degradation",
    "urgence": "aucune|surveillance|action_requise"
  },
  "valeurs_critiques": [
    { "date": "ISO", "valeur": "string", "niveau": "ROUGE|ORANGE" }
  ],
  "recommandation_suivi": "string (1-2 phrases)"
}

Retourne UNIQUEMENT le JSON, sans texte additionnel.`

  return prompt
}

function buildFollowUpContext(fu: FollowUpWithStats): string {
  const label = getDiseaseLabel(fu.disease_subtype)
  const targetsStr = JSON.stringify(fu.targets)

  return `CONTEXTE
Patient suivi a Maurice (Ile Maurice) via plateforme Tibok.
Suivi: ${label} (${fu.follow_up_type})
Debut: ${fu.started_at}
Frequence: ${fu.frequency}
Objectifs: ${targetsStr}

DONNEES
${fu.formatted_table}

STATISTIQUES
- Nombre de mesures: ${fu.stats.total_measures} / ${fu.stats.expected_measures} attendues (adherence ${fu.stats.adherence_percent}%)
- Moyenne: ${fu.stats.average}
- % dans les normes: ${fu.stats.in_range_percent}%
- Min: ${fu.stats.min} | Max: ${fu.stats.max}
- Tendance 7 jours: ${fu.stats.trend} (${fu.stats.trend_delta})
- Alertes: ${fu.stats.alert_count} sur ${fu.stats.total_measures} mesures
- Derniere alerte: ${fu.stats.last_alert ? `${fu.stats.last_alert.level} le ${fu.stats.last_alert.date}` : 'aucune'}
`
}
