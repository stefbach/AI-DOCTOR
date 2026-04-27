/**
 * Admin endpoint — Approve all chunks of a guideline (status: pending_review → active).
 *
 * POST body (form-data): source, guideline_code, version
 *
 * Auth: header `x-admin-email` must be present in `ADMIN_EMAILS_ALLOWLIST`.
 *       Production should replace with proper Supabase Auth / NextAuth.
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
  if (allowlist.length === 0) {
    console.warn('[Admin] ADMIN_EMAILS_ALLOWLIST is empty — refusing all admin actions')
    return false
  }
  return allowlist.includes(email.toLowerCase())
}

export async function POST(request: NextRequest) {
  // ─── Auth (minimal) ─────────────────────────────────────────────────────
  const userEmail = request.headers.get('x-admin-email')
  if (!isAdmin(userEmail)) {
    return NextResponse.json(
      { error: 'Forbidden — admin email required in x-admin-email header' },
      { status: 403 }
    )
  }

  // ─── Parse form ──────────────────────────────────────────────────────────
  const form = await request.formData()
  const source = form.get('source')?.toString()
  const code = form.get('guideline_code')?.toString()
  const version = form.get('version')?.toString()

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

  // ─── Update all chunks of this guideline+version to active ──────────────
  const { error, count } = await supabase
    .from('medical_guidelines')
    .update({
      status: 'active',
      validated_by: userEmail,
      validated_at: new Date().toISOString()
    })
    .eq('source', source)
    .eq('guideline_code', code)
    .eq('version', version)
    .eq('status', 'pending_review')
    .select('id', { count: 'exact', head: true })

  if (error) {
    console.error('[Admin] Approve failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // ─── Audit log ───────────────────────────────────────────────────────────
  await supabase.from('guideline_update_log').insert({
    source,
    guideline_code: code,
    action: 'validated',
    new_version: version,
    triggered_by: userEmail!,
    metadata: {
      decision: 'approved',
      chunks_affected: count || 0
    }
  })

  console.log(
    `✅ [Admin] ${userEmail} approved ${source}:${code} v${version} (${count || 0} chunks → active)`
  )

  // Redirect back to the admin page
  return NextResponse.redirect(new URL('/admin/guidelines', request.url), {
    status: 303
  })
}
