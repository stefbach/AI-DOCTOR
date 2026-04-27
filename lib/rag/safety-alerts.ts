/**
 * Drug Safety Alerts — Runtime
 *
 * For each consultation, checks all current patient medications against
 * active safety alerts (recalls FDA/EMA/MHRA/ANSM, black box warnings, etc.).
 *
 * If a hit is found, the alert is injected into the GPT-5.4 prompt and the
 * model is instructed to surface it in its response.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let _supabase: SupabaseClient | null = null

function supabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
  }
  return _supabase
}

// ============================================================================
// Types
// ============================================================================
export interface SafetyAlert {
  id: number
  source: string
  alert_type: string
  severity: string | null
  drug_name: string
  summary: string
  url: string
  published_date: string
  recommended_action: string | null
}

export interface DrugWithAlerts {
  drug: string
  alerts: SafetyAlert[]
}

// ============================================================================
// Lookup
// ============================================================================
export async function checkDrugSafety(drugName: string): Promise<SafetyAlert[]> {
  if (process.env.FEATURE_SAFETY_ALERTS !== 'true') return []
  if (!drugName || drugName.trim().length === 0) return []

  try {
    const { data, error } = await supabase().rpc('check_drug_alerts', {
      drug_name_input: drugName
    })
    if (error) {
      console.error('[Safety] Check failed:', error.message)
      return []
    }
    return (data || []) as SafetyAlert[]
  } catch (e) {
    console.error('[Safety] Exception:', e)
    return []
  }
}

export async function checkAllPatientDrugs(
  drugs: string[]
): Promise<DrugWithAlerts[]> {
  if (!drugs || drugs.length === 0) return []
  const unique = Array.from(new Set(drugs.filter(Boolean).map((d) => d.trim())))

  const results = await Promise.all(
    unique.map(async (drug) => ({
      drug,
      alerts: await checkDrugSafety(drug)
    }))
  )
  return results.filter((r) => r.alerts.length > 0)
}

// ============================================================================
// Prompt formatting
// ============================================================================
export function formatSafetyAlertsForPrompt(drugAlerts: DrugWithAlerts[]): string {
  if (drugAlerts.length === 0) return ''

  const sections = drugAlerts
    .map(
      ({ drug, alerts }) => `
⛔ ${drug.toUpperCase()}:
${alerts
  .map(
    (a) => `   • [${a.source} ${a.alert_type.toUpperCase()}${a.severity ? ' ' + a.severity : ''}]
     ${a.summary}
     Published: ${a.published_date}
     URL: ${a.url}
     ${a.recommended_action ? 'Recommended action: ' + a.recommended_action : ''}`
  )
  .join('\n')}
`
    )
    .join('\n')

  return `
🚨🚨🚨 CRITICAL DRUG SAFETY ALERTS — MUST BE ADDRESSED 🚨🚨🚨
═══════════════════════════════════════════════════════════════════════

The following drugs in this patient's context have ACTIVE safety alerts
that require immediate attention:

${sections}

═══════════════════════════════════════════════════════════════════════
⚠️ MANDATORY ACTIONS FOR YOUR RESPONSE:

1. DO NOT prescribe these drugs unless the benefit clearly outweighs the risk.
2. If the patient is currently taking these drugs, RECOMMEND IMMEDIATE REVIEW.
3. Suggest SAFE ALTERNATIVES in your treatment plan.
4. INCLUDE this alert in the patient education section.
5. Document the alert in the "warnings" field of the response.
═══════════════════════════════════════════════════════════════════════
`
}

// ============================================================================
// Normalization helper (shared with bulk-seed scripts)
// ============================================================================
export function normalizeDrugName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+\d+\s*(mg|g|ml|mcg|µg|iu)/gi, '')
    .replace(/[^a-z0-9]/g, '')
}
