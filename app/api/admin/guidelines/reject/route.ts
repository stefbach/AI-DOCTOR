/**
 * Admin endpoint — Reject all chunks of a guideline (status: pending_review → rejected).
 *
 * POST body (form-data): source, guideline_code, version
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function isAdmin(email: string | null): boolean {
  if (!email) return false
  const allowlist = (process.env.ADMIN_EMAILS_ALLOWLIST || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (allowlist.length === 0) return false
  return allowlist.includes(email.toLowerCase())
}

export async function POST(request: NextRequest) {
  const userEmail = request.headers.get('x-admin-email')
  if (!isAdmin(userEmail)) {
    return NextResponse.json(
      { error: 'Forbidden — admin email required in x-admin-email header' },
      { status: 403 }
    )
  }

  const form = await request.formData()
  const source = form.get('source')?.toString()
  const code = form.get('guideline_code')?.toString()
  const version = form.get('version')?.toString()
  const reason = form.get('reason')?.toString() || 'no reason provided'

  if (!source || !code || !version) {
    return NextResponse.json(
      { error: 'Missing source, guideline_code or version' },
      { status: 400 }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { error, count } = await supabase
    .from('medical_guidelines')
    .update({
      status: 'rejected',
      validated_by: userEmail,
      validated_at: new Date().toISOString(),
      validation_notes: reason
    })
    .eq('source', source)
    .eq('guideline_code', code)
    .eq('version', version)
    .eq('status', 'pending_review')
    .select('id', { count: 'exact', head: true })

  if (error) {
    console.error('[Admin] Reject failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await supabase.from('guideline_update_log').insert({
    source,
    guideline_code: code,
    action: 'rejected',
    new_version: version,
    triggered_by: userEmail!,
    metadata: {
      decision: 'rejected',
      reason,
      chunks_affected: count || 0
    }
  })

  console.log(
    `❌ [Admin] ${userEmail} rejected ${source}:${code} v${version} (${count || 0} chunks → rejected)`
  )

  return NextResponse.redirect(new URL('/admin/guidelines', request.url), {
    status: 303
  })
}
