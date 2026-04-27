/**
 * Webhook for ingestion of drug safety alerts from n8n.
 *
 * Auth: header X-Webhook-Secret must match N8N_WEBHOOK_SECRET.
 * Deduplication: by URL (unique constraint on drug_safety_alerts.url).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

export const runtime = 'nodejs'

const AlertSchema = z.object({
  source: z.enum(['FDA','EMA','MHRA','ANSM','HealthCanada','TGA','Swissmedic','OTHER']),
  alert_type: z.enum([
    'recall','black_box','contraindication','shortage',
    'safety_communication','dose_adjustment','interaction_warning'
  ]),
  severity: z.enum(['class_I','class_II','class_III','critical','moderate','low']).optional().nullable(),
  drug_name: z.string().min(1),
  drug_name_normalized: z.string().min(1),
  drug_name_aliases: z.array(z.string()).default([]),
  atc_code: z.string().optional().nullable(),
  summary: z.string().min(10),
  full_text: z.string().optional().nullable(),
  affected_lots: z.array(z.string()).default([]),
  affected_countries: z.array(z.string()).default([]),
  recommended_action: z.string().optional().nullable(),
  url: z.string().url(),
  published_date: z.string(),
  extraction_confidence: z.number().min(0).max(1).optional().nullable()
})

export async function POST(request: NextRequest) {
  if (request.headers.get('x-webhook-secret') !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let payload
  try {
    payload = AlertSchema.parse(await request.json())
  } catch (e: any) {
    return NextResponse.json({ error: 'Invalid payload', details: e.errors }, { status: 400 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Dedup
  const { data: existing } = await supabase
    .from('drug_safety_alerts')
    .select('id')
    .eq('url', payload.url)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      success: true,
      status: 'duplicate',
      existing_id: existing.id
    })
  }

  const { data, error } = await supabase
    .from('drug_safety_alerts')
    .insert({ ...payload, active: true, validated_by_human: false })
    .select()
    .single()

  if (error) {
    console.error('[Webhook n8n/safety-alert] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    alert_id: data.id,
    status: 'created'
  })
}
